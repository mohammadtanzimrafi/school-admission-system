namespace SchoolAdmission.Api.Http;

/// <summary>
/// An expected failure (bad input, no seats, hold expired...). It travels as a value, not
/// as an exception, and becomes an RFC 9457 problem response:
/// <code>{ "status": 409, "title": "Conflict", "code": "CLASS_FULL", "detail": "..." }</code>
/// <c>code</c> is the stable, machine-readable part that clients switch on.
/// </summary>
public sealed record Error(
    int Status,
    string Code,
    string Message,
    IReadOnlyDictionary<string, object?>? Extensions = null)
{
    public IResult ToProblem()
    {
        var extensions = new Dictionary<string, object?> { ["code"] = Code };
        foreach (var (key, value) in Extensions ?? new Dictionary<string, object?>())
        {
            extensions[key] = value;
        }

        return Results.Problem(detail: Message, statusCode: Status, extensions: extensions);
    }
}

/// <summary>Every error the API can return, in one catalogue.</summary>
public static class Errors
{
    public static Error Validation(IReadOnlyDictionary<string, string[]> fieldErrors) => new(
        StatusCodes.Status400BadRequest, "VALIDATION_FAILED", "One or more fields are invalid.",
        new Dictionary<string, object?> { ["errors"] = fieldErrors });

    public static readonly Error MalformedRequest = new(
        StatusCodes.Status400BadRequest, "INVALID_REQUEST", "The request body is missing or is not valid JSON for this endpoint.");

    public static readonly Error StudentIdRequired = new(
        StatusCodes.Status400BadRequest, "STUDENT_ID_REQUIRED", "The X-Student-Id header is required.");

    public static readonly Error StudentIdInvalid = new(
        StatusCodes.Status400BadRequest, "STUDENT_ID_INVALID", "X-Student-Id must be a 17-digit birth registration number.");

    public static readonly Error ClassNotFound = new(
        StatusCodes.Status404NotFound, "CLASS_NOT_FOUND", "This class does not exist.");

    public static readonly Error HoldNotFound = new(
        StatusCodes.Status404NotFound, "HOLD_NOT_FOUND", "This application does not exist.");

    public static readonly Error NotHoldOwner = new(
        StatusCodes.Status403Forbidden, "NOT_HOLD_OWNER", "This application belongs to another student.");

    public static readonly Error ClassFull = new(
        StatusCodes.Status409Conflict, "CLASS_FULL", "No seats are available in this class right now.");

    public static Error AlreadyApplied(Guid? existingHoldId) => new(
        StatusCodes.Status409Conflict, "ALREADY_APPLIED", "This student already has an active application or a confirmed admission in this class.",
        new Dictionary<string, object?> { ["holdId"] = existingHoldId });

    public static readonly Error HoldExpired = new(
        StatusCodes.Status409Conflict, "HOLD_EXPIRED", "This application has expired and its seat has been released.");

    public static readonly Error HoldCancelled = new(
        StatusCodes.Status409Conflict, "HOLD_CANCELLED", "This application has been cancelled.");

    public static readonly Error HoldAlreadyConfirmed = new(
        StatusCodes.Status409Conflict, "HOLD_ALREADY_CONFIRMED", "This admission is already confirmed and can no longer be cancelled.");

    public static readonly Error ServiceUnavailable = new(
        StatusCodes.Status503ServiceUnavailable, "SERVICE_UNAVAILABLE", "The service is temporarily unavailable. Please try again shortly.");

    public static readonly Error Unexpected = new(
        StatusCodes.Status500InternalServerError, "INTERNAL_ERROR", "Something went wrong on the server.");
}
