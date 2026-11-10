using Microsoft.AspNetCore.Diagnostics;
using SchoolAdmission.Api.Data;

namespace SchoolAdmission.Api.Http;

/// <summary>
/// Last stop for exceptions. Expected failures never get here (they are <see cref="Error"/>
/// values); this maps the unexpected ones to a JSON problem without leaking internals.
/// </summary>
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
        {
            // The client went away; there is nobody to answer.
            return true;
        }

        Error error;
        if (exception is BadHttpRequestException)
        {
            // Unreadable body, wrong JSON types, and similar binding failures.
            error = Errors.MalformedRequest;
        }
        else if (DatabaseErrors.IsUnavailable(exception))
        {
            logger.LogError(exception, "Database is unavailable");
            error = Errors.ServiceUnavailable;
        }
        else
        {
            logger.LogError(exception, "Unhandled exception for {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
            error = Errors.Unexpected;
        }

        await error.ToProblem().ExecuteAsync(httpContext);
        return true;
    }
}
