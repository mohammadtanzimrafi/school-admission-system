namespace SchoolAdmission.Api.Domain;

/// <summary>
/// One student's application for one class, as read from the hold_details view:
/// <see cref="Status"/> is already the effective status (a lapsed HELD reads as EXPIRED)
/// and <see cref="RemainingSeconds"/> is measured by the database clock.
/// </summary>
public sealed record Hold(
    Guid Id,
    Guid ClassId,
    string ClassName,
    string StudentId,
    string Status,
    DateTimeOffset ExpiresAt,
    double RemainingSeconds)
{
    public bool BelongsTo(StudentId student) => StudentId == student.Value;
}
