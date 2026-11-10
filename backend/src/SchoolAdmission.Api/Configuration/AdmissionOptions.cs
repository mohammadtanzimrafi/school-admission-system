namespace SchoolAdmission.Api.Configuration;

/// <summary>
/// Everything the app reads from its environment, validated once at startup so that a
/// typo fails loudly on boot instead of surfacing later as odd behaviour.
/// </summary>
public sealed record AdmissionOptions(
    string ConnectionString,
    int HoldDurationSeconds,
    TimeSpan SweepInterval,
    string[] CorsAllowedOrigins)
{
    public const string ConnectionStringName = "Database";
    public const string HoldDurationKey = "HOLD_DURATION_SECONDS";
    public const string SweepIntervalKey = "HOLD_SWEEP_INTERVAL_SECONDS";
    public const string CorsOriginsKey = "CORS_ALLOWED_ORIGINS";

    private const int DefaultHoldDurationSeconds = 600;
    private const int DefaultSweepIntervalSeconds = 30;

    public bool AllowsAnyOrigin => CorsAllowedOrigins.Contains("*");

    public static AdmissionOptions From(IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString(ConnectionStringName);
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                $"Missing database connection string. Set the ConnectionStrings__{ConnectionStringName} environment variable.");
        }

        var origins = (configuration[CorsOriginsKey] ?? "*")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return new AdmissionOptions(
            connectionString,
            PositiveSeconds(configuration, HoldDurationKey, DefaultHoldDurationSeconds),
            TimeSpan.FromSeconds(PositiveSeconds(configuration, SweepIntervalKey, DefaultSweepIntervalSeconds)),
            origins.Length == 0 ? ["*"] : origins);
    }

    private static int PositiveSeconds(IConfiguration configuration, string key, int fallback)
    {
        var raw = configuration[key];
        if (string.IsNullOrWhiteSpace(raw))
        {
            return fallback;
        }

        return int.TryParse(raw, out var seconds) && seconds > 0
            ? seconds
            : throw new InvalidOperationException($"{key} must be a whole number of seconds greater than zero, but was '{raw}'.");
    }
}
