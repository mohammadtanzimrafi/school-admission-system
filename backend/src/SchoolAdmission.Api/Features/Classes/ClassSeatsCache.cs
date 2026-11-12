using SchoolAdmission.Api.Domain;

namespace SchoolAdmission.Api.Features.Classes;

/// <summary>
/// Every open browser asks for the seat numbers every few seconds; on admission day that is
/// thousands of identical queries a second. This shares one answer between them:
/// <list type="bullet">
/// <item>for at most <c>maxAge</c>;</item>
/// <item>never past the next hold expiry in it, since an expiry frees a seat without a write;</item>
/// <item>dropped at once when this process changes a class or a hold (<see cref="Invalidate"/>).</item>
/// </list>
/// Requests that arrive while the query runs wait for it instead of starting their own.
/// A change made by another backend process shows within <c>maxAge</c>. Only the numbers
/// people read are cached; seat limits are enforced by the database on every write.
/// </summary>
public sealed class ClassSeatsCache(Func<CancellationToken, Task<IReadOnlyList<ClassSeats>>> load, TimeProvider time, TimeSpan maxAge)
{
    public static readonly TimeSpan DefaultMaxAge = TimeSpan.FromSeconds(1);

    private readonly Lock _gate = new();
    private long _version;
    private Snapshot? _snapshot;

    private sealed record Snapshot(long Version, long StartedAt, Task<IReadOnlyList<ClassSeats>> Seats);

    /// <summary>Every class with its seat numbers. The list is shared: do not change it.</summary>
    public Task<IReadOnlyList<ClassSeats>> GetAllAsync()
    {
        lock (_gate)
        {
            if (_snapshot is not { } current || current.Version != _version || !IsUsable(current))
            {
                // Not tied to any one request: a caller that gives up must not cancel the others.
                _snapshot = current = new Snapshot(_version, time.GetTimestamp(), load(CancellationToken.None));
            }

            return current.Seats;
        }
    }

    /// <summary>Call after this process changes a class or a hold, once the change is committed.</summary>
    public void Invalidate()
    {
        lock (_gate)
        {
            _version++;
        }
    }

    private bool IsUsable(Snapshot snapshot)
    {
        var seats = snapshot.Seats;
        if (!seats.IsCompleted)
        {
            return true; // Still loading: join it.
        }

        if (!seats.IsCompletedSuccessfully)
        {
            return false; // Failed (database down?): the next caller tries again.
        }

        var lifetime = maxAge;
        foreach (var row in seats.Result)
        {
            if (row.NextExpiryIn is { } untilExpiry && untilExpiry < lifetime)
            {
                lifetime = untilExpiry;
            }
        }

        // Measured from when the query started, so the answer is never older than it looks.
        return time.GetElapsedTime(snapshot.StartedAt) < lifetime;
    }
}
