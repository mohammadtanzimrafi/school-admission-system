using System.Data.Common;
using SchoolAdmission.Api.Domain;

namespace SchoolAdmission.Api.Data;

public enum PlaceHoldOutcome
{
    Placed,
    ClassNotFound,
    ClassFull,
    AlreadyApplied
}

/// <param name="Hold">The new hold when <see cref="Outcome"/> is Placed.</param>
/// <param name="ExistingHoldId">The student's current hold when <see cref="Outcome"/> is AlreadyApplied.</param>
public readonly record struct PlaceHoldResult(PlaceHoldOutcome Outcome, Hold? Hold = null, Guid? ExistingHoldId = null);

/// <summary>
/// All reads and writes of holds. Every rule that must survive concurrent requests lives
/// in the SQL here, so it holds no matter how many backend processes share the database.
/// </summary>
public sealed class HoldRepository(DbDataSource dataSource)
{
    private const string SelectHold =
        """
        SELECT id, class_id, class_name::text, student_id::text, status::text, expires_at, remaining_seconds
        FROM hold_details
        """;

    // One row per class: its capacity, how many seats are taken right now, and the
    // asking student's own seat-occupying hold (if any). Zero rows = unknown class.
    private const string OccupancySql =
        """
        SELECT c.total_seats,
               count(h.id)::integer AS taken_seats,
               (array_agg(h.id) FILTER (WHERE h.student_id = $2))[1] AS own_hold_id
        FROM classes c
        LEFT JOIN holds h
               ON h.class_id = c.id
              AND h.status IN ('HELD', 'CONFIRMED')
              AND (h.status = 'CONFIRMED' OR h.expires_at > statement_timestamp())
        WHERE c.id = $1
        GROUP BY c.id
        """;

    // FOR NO KEY UPDATE: every hold placement for this class queues behind this row
    // lock, in this process and in any other one talking to the same database.
    private const string LockClassSql =
        "SELECT name::text FROM classes WHERE id = $1 FOR NO KEY UPDATE";

    // A lapsed hold the sweeper has not reached yet would still sit in the unique
    // index and block the same student from applying again.
    private const string ReleaseOwnLapsedHoldSql =
        """
        UPDATE holds
        SET status = 'EXPIRED'
        WHERE class_id = $1 AND student_id = $2 AND status = 'HELD' AND expires_at <= statement_timestamp()
        """;

    private const string InsertHoldSql =
        """
        INSERT INTO holds (id, class_id, student_id, status, created_at, expires_at)
        VALUES ($1, $2, $3, 'HELD', statement_timestamp(), statement_timestamp() + $4 * interval '1 second')
        RETURNING expires_at
        """;

    // The WHERE clause is the whole rule: own hold, still HELD, not past its expiry.
    // Being a single statement, a repeated or concurrent call matches zero rows.
    private const string ConfirmSql =
        """
        UPDATE holds
        SET status = 'CONFIRMED', confirmed_at = statement_timestamp()
        WHERE id = $1 AND student_id = $2 AND status = 'HELD' AND expires_at > statement_timestamp()
        """;

    private const string CancelSql =
        """
        UPDATE holds
        SET status = 'CANCELLED', cancelled_at = statement_timestamp()
        WHERE id = $1 AND student_id = $2 AND status = 'HELD' AND expires_at > statement_timestamp()
        """;

    // SKIP LOCKED: never waits on a row another transaction is working on, so the
    // sweeper cannot deadlock with, or slow down, live requests.
    private const string SweepSql =
        """
        UPDATE holds
        SET status = 'EXPIRED'
        WHERE id IN (
            SELECT id
            FROM holds
            WHERE status = 'HELD' AND expires_at <= statement_timestamp()
            ORDER BY expires_at
            LIMIT $1
            FOR UPDATE SKIP LOCKED
        )
        """;

    /// <summary>
    /// Holds a seat for the student if one is free.
    /// <para>
    /// Invariant: held + confirmed never exceeds total_seats. The class row is locked, the
    /// seats are counted under that lock, and the hold is inserted before the lock is
    /// released, so two requests can never both take the last seat.
    /// </para>
    /// </summary>
    public async Task<PlaceHoldResult> PlaceAsync(Guid classId, StudentId student, int holdSeconds, CancellationToken ct)
    {
        await using var connection = await dataSource.OpenConnectionAsync(ct);

        // Fast path without any lock. When thousands apply for a class that is already
        // full, they are turned away by one cheap read instead of queueing on the lock.
        // A rejection here is still correct: it was true at the moment of the read.
        var glance = await ReadOccupancyAsync(connection, transaction: null, classId, student, ct);
        if (Reject(glance) is { } earlyRejection)
        {
            return earlyRejection;
        }

        await using var transaction = await connection.BeginTransactionAsync(ct);

        var className = await connection
            .Sql(transaction, LockClassSql, classId)
            .QuerySingleOrDefaultAsync(row => row.GetString(0), ct);
        if (className is null)
        {
            return new PlaceHoldResult(PlaceHoldOutcome.ClassNotFound);
        }

        await connection.Sql(transaction, ReleaseOwnLapsedHoldSql, classId, student.Value).ExecuteAsync(ct);

        // The authoritative check: nothing can change this class's seats until we commit.
        var occupancy = await ReadOccupancyAsync(connection, transaction, classId, student, ct);
        if (Reject(occupancy) is { } rejection)
        {
            await transaction.CommitAsync(ct);
            return rejection;
        }

        var holdId = Guid.CreateVersion7();
        try
        {
            var expiresAt = (await connection
                .Sql(transaction, InsertHoldSql, holdId, classId, student.Value, holdSeconds)
                .QueryAsync(row => row.GetFieldValue<DateTimeOffset>(0), ct))
                .Single();

            await transaction.CommitAsync(ct);

            return new PlaceHoldResult(PlaceHoldOutcome.Placed,
                new Hold(holdId, classId, className, student.Value, HoldStatus.Held, expiresAt, holdSeconds));
        }
        catch (DbException ex) when (DatabaseErrors.IsUniqueViolation(ex))
        {
            // Unreachable while every writer takes the class lock; the unique index is the
            // last line of defence and we honour it rather than fail with a server error.
            return new PlaceHoldResult(PlaceHoldOutcome.AlreadyApplied);
        }
    }

    public Task<Hold?> FindAsync(Guid holdId, CancellationToken ct) =>
        dataSource.Sql($"{SelectHold} WHERE id = $1", holdId).QuerySingleOrDefaultAsync(Map, ct);

    public Task<List<Hold>> ListByStudentAsync(StudentId student, CancellationToken ct) =>
        dataSource.Sql($"{SelectHold} WHERE student_id = $1 ORDER BY created_at DESC, id DESC", student.Value).QueryAsync(Map, ct);

    /// <summary>Moves the student's own, unexpired HELD hold to CONFIRMED. Returns false if no such hold.</summary>
    public async Task<bool> TryConfirmAsync(Guid holdId, StudentId student, CancellationToken ct) =>
        await dataSource.Sql(ConfirmSql, holdId, student.Value).ExecuteAsync(ct) == 1;

    /// <summary>Moves the student's own, unexpired HELD hold to CANCELLED. Returns false if no such hold.</summary>
    public async Task<bool> TryCancelAsync(Guid holdId, StudentId student, CancellationToken ct) =>
        await dataSource.Sql(CancelSql, holdId, student.Value).ExecuteAsync(ct) == 1;

    /// <summary>Marks up to <paramref name="batchSize"/> lapsed holds as EXPIRED. Returns how many were marked.</summary>
    public Task<int> SweepLapsedAsync(int batchSize, CancellationToken ct) =>
        dataSource.Sql(SweepSql, batchSize).ExecuteAsync(ct);

    private sealed record Occupancy(int TotalSeats, int TakenSeats, Guid? OwnHoldId);

    private static Task<Occupancy?> ReadOccupancyAsync(
        DbConnection connection, DbTransaction? transaction, Guid classId, StudentId student, CancellationToken ct) =>
        connection
            .Sql(transaction, OccupancySql, classId, student.Value)
            .QuerySingleOrDefaultAsync(row => new Occupancy(
                TotalSeats: row.GetInt32(0),
                TakenSeats: row.GetInt32(1),
                OwnHoldId: row.IsDBNull(2) ? null : row.GetGuid(2)), ct);

    /// <summary>The seat rules in one place. Returns null when a hold may be placed.</summary>
    private static PlaceHoldResult? Reject(Occupancy? occupancy) => occupancy switch
    {
        null => new PlaceHoldResult(PlaceHoldOutcome.ClassNotFound),
        { OwnHoldId: { } existing } => new PlaceHoldResult(PlaceHoldOutcome.AlreadyApplied, ExistingHoldId: existing),
        _ when occupancy.TakenSeats >= occupancy.TotalSeats => new PlaceHoldResult(PlaceHoldOutcome.ClassFull),
        _ => null
    };

    private static Hold Map(DbDataReader row) => new(
        Id: row.GetGuid(0),
        ClassId: row.GetGuid(1),
        ClassName: row.GetString(2),
        StudentId: row.GetString(3),
        Status: row.GetString(4),
        ExpiresAt: row.GetFieldValue<DateTimeOffset>(5),
        RemainingSeconds: row.GetDouble(6));
}
