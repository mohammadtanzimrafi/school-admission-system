using System.Data.Common;
using System.Reflection;

namespace SchoolAdmission.Api.Data;

/// <summary>
/// Applies the embedded SQL migrations (Data/Migrations/*.sql) in file-name order and
/// records each one in schema_migrations, so restarting the app never re-runs a script.
/// </summary>
public sealed class DatabaseMigrator(DbDataSource dataSource, ILogger<DatabaseMigrator> logger)
{
    private const string ResourcePrefix = "Migrations/";

    // Any constant works; it only has to be the same in every backend process.
    private const long MigrationLockKey = 7_203_114_001;

    private const int MaxConnectionAttempts = 30;
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(2);

    /// <summary>Waits for PostgreSQL to accept connections, then brings the schema up to date.</summary>
    public async Task MigrateAsync(CancellationToken ct = default)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await ApplyPendingAsync(ct);
                return;
            }
            catch (Exception ex) when (DatabaseErrors.IsUnavailable(ex) && attempt < MaxConnectionAttempts)
            {
                logger.LogWarning("Database is not reachable yet (attempt {Attempt}/{Max}): {Reason}",
                    attempt, MaxConnectionAttempts, ex.Message);
                await Task.Delay(RetryDelay, ct);
            }
        }
    }

    private async Task ApplyPendingAsync(CancellationToken ct)
    {
        await using var connection = await dataSource.OpenConnectionAsync(ct);
        await using var transaction = await connection.BeginTransactionAsync(ct);

        // Several backend processes may start together against the same database. The
        // advisory lock makes them take turns; it is released when the transaction ends.
        await connection.Sql(transaction, "SELECT pg_advisory_xact_lock($1)", MigrationLockKey).ExecuteAsync(ct);

        await connection.Sql(transaction,
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version    varchar(100) PRIMARY KEY,
                applied_at timestamptz  NOT NULL DEFAULT statement_timestamp()
            )
            """).ExecuteAsync(ct);

        var applied = (await connection
                .Sql(transaction, "SELECT version::text FROM schema_migrations")
                .QueryAsync(row => row.GetString(0), ct))
            .ToHashSet(StringComparer.Ordinal);

        foreach (var (version, script) in LoadScripts())
        {
            if (applied.Contains(version))
            {
                continue;
            }

            logger.LogInformation("Applying database migration {Version}", version);
            await connection.Sql(transaction, script).ExecuteAsync(ct);
            await connection.Sql(transaction, "INSERT INTO schema_migrations (version) VALUES ($1)", version).ExecuteAsync(ct);
        }

        // PostgreSQL DDL is transactional: a failing script leaves the schema untouched.
        await transaction.CommitAsync(ct);
    }

    private static IEnumerable<(string Version, string Script)> LoadScripts()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var names = assembly.GetManifestResourceNames()
            .Where(name => name.StartsWith(ResourcePrefix, StringComparison.Ordinal))
            .Order(StringComparer.Ordinal);

        foreach (var name in names)
        {
            using var stream = assembly.GetManifestResourceStream(name)!;
            using var reader = new StreamReader(stream);
            yield return (Path.GetFileNameWithoutExtension(name[ResourcePrefix.Length..]), reader.ReadToEnd());
        }
    }
}
