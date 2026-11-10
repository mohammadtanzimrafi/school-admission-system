namespace SchoolAdmission.Api.Domain;

/// <summary>A class together with its live seat accounting.</summary>
public sealed record ClassSeats(Guid Id, string Name, int TotalSeats, int HeldSeats, int ConfirmedSeats)
{
    public int AvailableSeats => TotalSeats - HeldSeats - ConfirmedSeats;
}
