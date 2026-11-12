using SchoolAdmission.Api.Domain;
using SchoolAdmission.Api.Features.Classes;

namespace SchoolAdmission.Api.Tests;

/// <summary>The shared seat-number cache, with a hand-driven clock and a counting loader. No database.</summary>
public sealed class ClassSeatsCacheTests
{
    private static readonly TimeSpan MaxAge = TimeSpan.FromSeconds(1);

    private readonly ManualTime _time = new();
    private int _queries;
    private Func<Task<IReadOnlyList<ClassSeats>>> _answer = () => Task.FromResult(Rows());

    private ClassSeatsCache NewCache() => new(_ =>
    {
        _queries++;
        return _answer();
    }, _time, MaxAge);

    private static IReadOnlyList<ClassSeats> Rows(TimeSpan? nextExpiryIn = null) =>
        [new ClassSeats(Guid.NewGuid(), "Class 6 - Morning Shift", 120, 15, 80, nextExpiryIn)];

    [Fact]
    public async Task Requests_within_max_age_share_one_query()
    {
        var cache = NewCache();

        await cache.GetAllAsync();
        _time.Advance(TimeSpan.FromMilliseconds(900));
        await cache.GetAllAsync();
        Assert.Equal(1, _queries);

        _time.Advance(TimeSpan.FromMilliseconds(200));
        await cache.GetAllAsync();
        Assert.Equal(2, _queries);
    }

    [Fact]
    public async Task An_answer_is_never_kept_past_the_next_hold_expiry_in_it()
    {
        _answer = () => Task.FromResult(Rows(nextExpiryIn: TimeSpan.FromMilliseconds(300)));
        var cache = NewCache();

        await cache.GetAllAsync();
        _time.Advance(TimeSpan.FromMilliseconds(350));
        await cache.GetAllAsync();

        Assert.Equal(2, _queries);
    }

    [Fact]
    public async Task A_change_in_this_process_is_seen_at_once()
    {
        var cache = NewCache();
        await cache.GetAllAsync();

        cache.Invalidate();
        await cache.GetAllAsync();

        Assert.Equal(2, _queries);
    }

    [Fact]
    public async Task Callers_arriving_during_a_query_wait_for_it_instead_of_starting_another()
    {
        var pending = new TaskCompletionSource<IReadOnlyList<ClassSeats>>();
        _answer = () => pending.Task;
        var cache = NewCache();

        var callers = Enumerable.Range(0, 50).Select(_ => cache.GetAllAsync()).ToList();
        pending.SetResult(Rows());
        await Task.WhenAll(callers);

        Assert.Equal(1, _queries);
    }

    [Fact]
    public async Task A_failed_query_is_not_kept()
    {
        _answer = () => Task.FromException<IReadOnlyList<ClassSeats>>(new TimeoutException("database down"));
        var cache = NewCache();
        await Assert.ThrowsAsync<TimeoutException>(cache.GetAllAsync);

        _answer = () => Task.FromResult(Rows());
        var seats = await cache.GetAllAsync();

        Assert.Single(seats);
        Assert.Equal(2, _queries);
    }

    /// <summary>A clock that only moves when told to; one tick is one millisecond.</summary>
    private sealed class ManualTime : TimeProvider
    {
        private long _now;

        public override long TimestampFrequency => 1000;

        public override long GetTimestamp() => _now;

        public void Advance(TimeSpan by) => _now += (long)by.TotalMilliseconds;
    }
}
