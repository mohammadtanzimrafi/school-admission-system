using System.Data.Common;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace SchoolAdmission.Api.Tests.Infrastructure;

/// <summary>
/// Test fixture: a throwaway PostgreSQL database plus one or more real API processes'
/// worth of app, each listening on its own loopback port. Nothing is mocked; requests
/// travel over HTTP and hit real SQL, which is the only honest way to test seat locking.
/// <para>
/// The server to use comes from TEST_DATABASE_CONNECTION (any database on it will do;
/// the fixture creates and drops its own).
/// </para>
/// </summary>
public sealed class AdmissionTestHost : IAsyncLifetime
{
    private const string DefaultAdminConnection =
        "Host=localhost;Port=5432;Database=postgres;Username=postgres;Password=postgres";

    private readonly string _adminConnection =
        Environment.GetEnvironmentVariable("TEST_DATABASE_CONNECTION") ?? DefaultAdminConnection;

    private readonly string _databaseName = $"admission_test_{Guid.NewGuid():N}";
    private readonly List<WebApplication> _apps = [];

    /// <summary>The default API instance, with the production hold duration (10 minutes).</summary>
    public ApiClient Api { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        await ExecuteOnServerAsync($"CREATE DATABASE \"{_databaseName}\"");
        Api = await StartApiAsync();
    }

    /// <summary>
    /// Starts another API instance against the same database, the way a second backend
    /// process would run. Use it for a different hold duration or for multi-instance tests.
    /// </summary>
    public async Task<ApiClient> StartApiAsync(int holdDurationSeconds = 600)
    {
        var connection = new DbConnectionStringBuilder { ConnectionString = _adminConnection };
        connection["Database"] = _databaseName;
        connection["Maximum Pool Size"] = 20;

        var app = AdmissionApp.Build([], builder =>
        {
            builder.WebHost.UseUrls("http://127.0.0.1:0");
            builder.Logging.SetMinimumLevel(LogLevel.Warning);
            builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Database"] = connection.ConnectionString,
                ["HOLD_DURATION_SECONDS"] = holdDurationSeconds.ToString(),
                ["HOLD_SWEEP_INTERVAL_SECONDS"] = "1"
            });
        });

        await app.InitialiseDatabaseAsync();
        await app.StartAsync();
        _apps.Add(app);

        return new ApiClient(new HttpClient { BaseAddress = new Uri(app.Urls.Single()) }, app);
    }

    /// <summary>Stops one API instance, as if its process had exited.</summary>
    public async Task StopApiAsync(ApiClient api)
    {
        _apps.Remove(api.App);
        api.Http.Dispose();
        await api.App.StopAsync();
        await api.App.DisposeAsync();
    }

    public async Task DisposeAsync()
    {
        foreach (var app in _apps.ToArray())
        {
            await app.StopAsync();
            await app.DisposeAsync();
        }

        await ExecuteOnServerAsync($"DROP DATABASE IF EXISTS \"{_databaseName}\" WITH (FORCE)");
    }

    private async Task ExecuteOnServerAsync(string sql)
    {
        await using DbDataSource server = NpgsqlDataSource.Create(_adminConnection);
        await using var command = server.CreateCommand(sql);
        await command.ExecuteNonQueryAsync();
    }
}
