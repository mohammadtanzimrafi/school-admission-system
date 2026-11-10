using SchoolAdmission.Api.Configuration;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Domain;
using SchoolAdmission.Api.Http;

namespace SchoolAdmission.Api.Features.Holds;

/// <summary>The application lifecycle: apply (hold a seat), pay (confirm), withdraw (cancel).</summary>
public sealed class HoldService(HoldRepository holds, AdmissionOptions options)
{
    public async Task<Result<Hold>> PlaceAsync(string classId, StudentId student, CancellationToken ct)
    {
        if (!PublicId.TryParse(classId, out var id))
        {
            return Errors.ClassNotFound;
        }

        var result = await holds.PlaceAsync(id, student, options.HoldDurationSeconds, ct);
        return result.Outcome switch
        {
            PlaceHoldOutcome.Placed => result.Hold!,
            PlaceHoldOutcome.ClassNotFound => Errors.ClassNotFound,
            PlaceHoldOutcome.ClassFull => Errors.ClassFull,
            PlaceHoldOutcome.AlreadyApplied => Errors.AlreadyApplied(result.ExistingHoldId),
            _ => throw new InvalidOperationException($"Unknown outcome {result.Outcome}.")
        };
    }

    public async Task<Result<Hold>> GetAsync(string holdId, CancellationToken ct)
    {
        var hold = PublicId.TryParse(holdId, out var id) ? await holds.FindAsync(id, ct) : null;
        return hold is null ? Errors.HoldNotFound : hold;
    }

    public Task<List<Hold>> ListForStudentAsync(StudentId student, CancellationToken ct) =>
        holds.ListByStudentAsync(student, ct);

    /// <summary>
    /// Pays the fee. Safe to repeat: the database moves HELD to CONFIRMED at most once,
    /// and a repeated call simply reports the already-confirmed hold.
    /// </summary>
    public async Task<Result<Hold>> ConfirmAsync(string holdId, StudentId student, CancellationToken ct)
    {
        if (!PublicId.TryParse(holdId, out var id))
        {
            return Errors.HoldNotFound;
        }

        // Attempt first, explain afterwards. The attempt is one atomic statement; the
        // read below only decides which answer to give.
        await holds.TryConfirmAsync(id, student, ct);

        var owned = await FindOwnedAsync(id, student, ct);
        if (!owned.IsSuccess)
        {
            return owned;
        }

        return owned.Value.Status switch
        {
            HoldStatus.Confirmed => owned,
            HoldStatus.Cancelled => Errors.HoldCancelled,
            _ => Errors.HoldExpired
        };
    }

    /// <summary>Withdraws an application and frees its seat. Repeating it on a cancelled hold succeeds again.</summary>
    public async Task<Result<Hold>> CancelAsync(string holdId, StudentId student, CancellationToken ct)
    {
        if (!PublicId.TryParse(holdId, out var id))
        {
            return Errors.HoldNotFound;
        }

        await holds.TryCancelAsync(id, student, ct);

        var owned = await FindOwnedAsync(id, student, ct);
        if (!owned.IsSuccess)
        {
            return owned;
        }

        return owned.Value.Status switch
        {
            HoldStatus.Cancelled => owned,
            HoldStatus.Confirmed => Errors.HoldAlreadyConfirmed,
            _ => Errors.HoldExpired
        };
    }

    private async Task<Result<Hold>> FindOwnedAsync(Guid holdId, StudentId student, CancellationToken ct)
    {
        var hold = await holds.FindAsync(holdId, ct);
        if (hold is null)
        {
            return Errors.HoldNotFound;
        }

        return hold.BelongsTo(student) ? hold : Errors.NotHoldOwner;
    }
}
