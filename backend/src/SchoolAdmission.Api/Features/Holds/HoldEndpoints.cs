using SchoolAdmission.Api.Http;

namespace SchoolAdmission.Api.Features.Holds;

public static class HoldEndpoints
{
    public static IEndpointRouteBuilder MapHoldEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/classes/{classId}/holds", PlaceAsync).RequireStudentId();
        app.MapGet("/holds/{holdId}", GetAsync);
        app.MapPost("/holds/{holdId}/confirm", ConfirmAsync).RequireStudentId();
        app.MapDelete("/holds/{holdId}", CancelAsync).RequireStudentId();
        app.MapGet("/me/holds", ListMineAsync).RequireStudentId();
        return app;
    }

    private static async Task<IResult> PlaceAsync(string classId, HttpContext http, HoldService service, CancellationToken ct)
    {
        var result = await service.PlaceAsync(classId, http.GetStudentId(), ct);
        return result.ToHttp(hold => Results.Created($"/holds/{hold.Id}", HoldResponse.From(hold, includeStudentId: true)));
    }

    private static async Task<IResult> GetAsync(string holdId, HoldService service, CancellationToken ct)
    {
        var result = await service.GetAsync(holdId, ct);
        return result.ToHttp(hold => Results.Ok(HoldResponse.From(hold)));
    }

    private static async Task<IResult> ConfirmAsync(string holdId, HttpContext http, HoldService service, CancellationToken ct)
    {
        var result = await service.ConfirmAsync(holdId, http.GetStudentId(), ct);
        return result.ToHttp(hold => Results.Ok(HoldResponse.From(hold)));
    }

    private static async Task<IResult> CancelAsync(string holdId, HttpContext http, HoldService service, CancellationToken ct)
    {
        var result = await service.CancelAsync(holdId, http.GetStudentId(), ct);
        return result.ToHttp(_ => Results.NoContent());
    }

    private static async Task<IResult> ListMineAsync(HttpContext http, HoldService service, CancellationToken ct)
    {
        var holds = await service.ListForStudentAsync(http.GetStudentId(), ct);
        return Results.Ok(holds.Select(hold => HoldResponse.From(hold)));
    }
}
