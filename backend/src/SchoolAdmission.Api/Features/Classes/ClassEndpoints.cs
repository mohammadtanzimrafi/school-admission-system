namespace SchoolAdmission.Api.Features.Classes;

public static class ClassEndpoints
{
    public static IEndpointRouteBuilder MapClassEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/classes", CreateAsync);
        app.MapGet("/classes", ListAsync);
        app.MapGet("/classes/{classId}", GetAsync);
        return app;
    }

    private static async Task<IResult> CreateAsync(CreateClassRequest? request, ClassService service, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        return result.ToHttp(created => Results.Created($"/classes/{created.Id}", ClassResponse.From(created)));
    }

    private static async Task<IResult> ListAsync(ClassService service, CancellationToken ct)
    {
        var classes = await service.ListAsync(ct);
        return Results.Ok(classes.Select(ClassResponse.From));
    }

    private static async Task<IResult> GetAsync(string classId, ClassService service, CancellationToken ct)
    {
        var result = await service.GetAsync(classId, ct);
        return result.ToHttp(seats => Results.Ok(ClassResponse.From(seats)));
    }
}
