using SchoolAdmission.Api.Domain;

namespace SchoolAdmission.Api.Features.Classes;

/// <summary>Body of POST /classes. Both fields are nullable so that a missing one is a validation error, not a crash.</summary>
public sealed record CreateClassRequest(string? Name, int? TotalSeats);

/// <summary>A class with its seat accounting, as returned by every /classes endpoint.</summary>
public sealed record ClassResponse(
    Guid Id,
    string Name,
    int TotalSeats,
    int HeldSeats,
    int ConfirmedSeats,
    int AvailableSeats)
{
    public static ClassResponse From(ClassSeats seats) => new(
        seats.Id, seats.Name, seats.TotalSeats, seats.HeldSeats, seats.ConfirmedSeats, seats.AvailableSeats);
}
