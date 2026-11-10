using System.Data.Common;
using SchoolAdmission.Api.Domain;

namespace SchoolAdmission.Api.Data;

public sealed class ClassRepository(DbDataSource dataSource)
{
    private const string SelectSeats =
        "SELECT id, name::text, total_seats, held_seats, confirmed_seats FROM class_seats";

    public async Task<ClassSeats> CreateAsync(string name, int totalSeats, CancellationToken ct)
    {
        // Version 7 UUIDs are time-ordered, so new rows land at the end of the index.
        var id = Guid.CreateVersion7();

        await dataSource
            .Sql("INSERT INTO classes (id, name, total_seats) VALUES ($1, $2, $3)", id, name, totalSeats)
            .ExecuteAsync(ct);

        return new ClassSeats(id, name, totalSeats, HeldSeats: 0, ConfirmedSeats: 0);
    }

    public Task<List<ClassSeats>> ListAsync(CancellationToken ct) =>
        dataSource.Sql($"{SelectSeats} ORDER BY created_at, id").QueryAsync(Map, ct);

    public Task<ClassSeats?> FindAsync(Guid id, CancellationToken ct) =>
        dataSource.Sql($"{SelectSeats} WHERE id = $1", id).QuerySingleOrDefaultAsync(Map, ct);

    private static ClassSeats Map(DbDataReader row) => new(
        Id: row.GetGuid(0),
        Name: row.GetString(1),
        TotalSeats: row.GetInt32(2),
        HeldSeats: row.GetInt32(3),
        ConfirmedSeats: row.GetInt32(4));
}
