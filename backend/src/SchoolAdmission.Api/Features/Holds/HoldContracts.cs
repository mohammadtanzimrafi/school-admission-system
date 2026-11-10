using System.Text.Json.Serialization;
using SchoolAdmission.Api.Domain;

namespace SchoolAdmission.Api.Features.Holds;

/// <summary>
/// An application as returned by every hold endpoint. The contract's fields are always
/// present; className and remainingSeconds are extras for the UI.
/// </summary>
/// <param name="StudentId">
/// Only sent back to the student who just applied. GET /holds/{id} needs no identity
/// header, so it must not hand a birth registration number to whoever knows the id.
/// </param>
/// <param name="RemainingSeconds">
/// Seconds until the hold expires, measured by the server. The UI counts down from
/// this instead of trusting the device clock. Zero unless the status is HELD.
/// </param>
public sealed record HoldResponse(
    Guid HoldId,
    Guid ClassId,
    string ClassName,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? StudentId,
    string Status,
    DateTimeOffset ExpiresAt,
    double RemainingSeconds)
{
    public static HoldResponse From(Hold hold, bool includeStudentId = false) => new(
        hold.Id,
        hold.ClassId,
        hold.ClassName,
        includeStudentId ? hold.StudentId : null,
        hold.Status,
        hold.ExpiresAt,
        Math.Round(hold.RemainingSeconds, 3));
}
