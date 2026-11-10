using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Domain;
using SchoolAdmission.Api.Http;

namespace SchoolAdmission.Api.Features.Classes;

public sealed class ClassService(ClassRepository classes)
{
    public const int MaxNameLength = 100;
    public const int MaxTotalSeats = 100_000;

    public async Task<Result<ClassSeats>> CreateAsync(CreateClassRequest? request, CancellationToken ct)
    {
        var name = request?.Name?.Trim() ?? "";
        var totalSeats = request?.TotalSeats;

        var problems = new Dictionary<string, string[]>();
        if (name.Length == 0)
        {
            problems["name"] = ["Class name is required."];
        }
        else if (name.Length > MaxNameLength)
        {
            problems["name"] = [$"Class name must be at most {MaxNameLength} characters."];
        }

        if (totalSeats is null)
        {
            problems["totalSeats"] = ["Total seats is required."];
        }
        else if (totalSeats is < 1 or > MaxTotalSeats)
        {
            problems["totalSeats"] = [$"Total seats must be a whole number between 1 and {MaxTotalSeats}."];
        }

        if (problems.Count > 0)
        {
            return Errors.Validation(problems);
        }

        return await classes.CreateAsync(name, totalSeats!.Value, ct);
    }

    public Task<List<ClassSeats>> ListAsync(CancellationToken ct) => classes.ListAsync(ct);

    public async Task<Result<ClassSeats>> GetAsync(string classId, CancellationToken ct)
    {
        if (!PublicId.TryParse(classId, out var id))
        {
            return Errors.ClassNotFound;
        }

        var seats = await classes.FindAsync(id, ct);
        return seats is null ? Errors.ClassNotFound : seats;
    }
}
