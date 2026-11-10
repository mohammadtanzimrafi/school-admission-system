using SchoolAdmission.Api.Domain;

namespace SchoolAdmission.Api.Http;

/// <summary>
/// There is no login: the caller states who the student is in the X-Student-Id header.
/// Endpoints marked with <see cref="RequireStudentId"/> only run with a well-formed id.
/// </summary>
internal static class StudentIdentity
{
    public const string HeaderName = "X-Student-Id";

    private static readonly object ItemKey = new();

    public static RouteHandlerBuilder RequireStudentId(this RouteHandlerBuilder builder) =>
        builder.AddEndpointFilter(async (invocation, next) =>
        {
            var http = invocation.HttpContext;
            var header = http.Request.Headers[HeaderName].ToString();

            if (string.IsNullOrWhiteSpace(header))
            {
                return Errors.StudentIdRequired.ToProblem();
            }

            if (!StudentId.TryParse(header, out var studentId))
            {
                return Errors.StudentIdInvalid.ToProblem();
            }

            http.Items[ItemKey] = studentId;
            return await next(invocation);
        });

    public static StudentId GetStudentId(this HttpContext http) =>
        http.Items[ItemKey] is StudentId studentId
            ? studentId
            : throw new InvalidOperationException($"Endpoint is missing {nameof(RequireStudentId)}().");
}
