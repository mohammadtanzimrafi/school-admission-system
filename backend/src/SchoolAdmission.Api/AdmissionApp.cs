using System.Data.Common;
using Npgsql;
using SchoolAdmission.Api.Configuration;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Features.Classes;
using SchoolAdmission.Api.Features.Holds;
using SchoolAdmission.Api.Http;

namespace SchoolAdmission.Api;

/// <summary>Composition root: wires configuration, services, middleware and routes.</summary>
public static class AdmissionApp
{
    /// <param name="args">Command-line arguments.</param>
    /// <param name="configure">Hook for tests to override configuration before services are built.</param>
    public static WebApplication Build(string[] args, Action<WebApplicationBuilder>? configure = null)
    {
        var builder = WebApplication.CreateBuilder(args);
        configure?.Invoke(builder);

        var options = AdmissionOptions.From(builder.Configuration);
        builder.Services.AddSingleton(options);

        // Data access. The data source owns the connection pool and is shared by everything.
        builder.Services.AddSingleton<DbDataSource>(_ => NpgsqlDataSource.Create(options.ConnectionString));
        builder.Services.AddSingleton<DatabaseMigrator>();
        builder.Services.AddSingleton<ClassRepository>();
        builder.Services.AddSingleton<HoldRepository>();

        // Application services.
        builder.Services.AddSingleton<ClassService>();
        builder.Services.AddSingleton<HoldService>();
        builder.Services.AddHostedService<HoldExpirySweeper>();

        // HTTP plumbing: every failure, expected or not, leaves as a JSON problem document.
        builder.Services.AddProblemDetails(problem => problem.CustomizeProblemDetails = AddErrorCode);
        builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
        builder.Services.Configure<RouteHandlerOptions>(route => route.ThrowOnBadRequest = true);
        builder.Services.ConfigureHttpJsonOptions(json =>
            json.SerializerOptions.Converters.Add(new UtcTimestampJsonConverter()));

        builder.Services.AddCors(cors => cors.AddDefaultPolicy(policy =>
        {
            if (options.AllowsAnyOrigin)
            {
                policy.AllowAnyOrigin();
            }
            else
            {
                policy.WithOrigins(options.CorsAllowedOrigins);
            }

            policy.AllowAnyHeader().AllowAnyMethod().SetPreflightMaxAge(TimeSpan.FromMinutes(10));
        }));

        var app = builder.Build();

        app.UseExceptionHandler();
        app.UseStatusCodePages();
        app.UseCors();

        app.MapClassEndpoints();
        app.MapHoldEndpoints();
        app.MapGet("/health", CheckHealthAsync);

        return app;
    }

    /// <summary>Brings the database schema up to date. Call once before serving requests.</summary>
    public static Task InitialiseDatabaseAsync(this WebApplication app, CancellationToken ct = default) =>
        app.Services.GetRequiredService<DatabaseMigrator>().MigrateAsync(ct);

    private static async Task<IResult> CheckHealthAsync(DbDataSource dataSource, CancellationToken ct)
    {
        // Throws if PostgreSQL is unreachable, which the exception handler reports as 503.
        await dataSource.Sql("SELECT 1").ExecuteAsync(ct);
        return Results.Ok(new { status = "ok" });
    }

    /// <summary>Gives framework-generated problems (unknown route, wrong method...) the same "code" field as ours.</summary>
    private static void AddErrorCode(ProblemDetailsContext context)
    {
        var problem = context.ProblemDetails;
        if (problem.Extensions.ContainsKey("code"))
        {
            return;
        }

        problem.Extensions["code"] = problem.Status switch
        {
            StatusCodes.Status404NotFound => "NOT_FOUND",
            StatusCodes.Status405MethodNotAllowed => "METHOD_NOT_ALLOWED",
            StatusCodes.Status415UnsupportedMediaType => "UNSUPPORTED_MEDIA_TYPE",
            _ => $"HTTP_{problem.Status}"
        };
    }
}
