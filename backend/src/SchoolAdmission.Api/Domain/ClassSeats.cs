namespace SchoolAdmission.Api.Domain;

/// <summary>A class together with its live seat accounting.</summary>
/// <param name="NextExpiryIn">
/// How soon the earliest held seat frees itself, if any is held; the numbers are only
/// guaranteed until then. Not part of the API response.
/// </param>
public sealed record ClassSeats(Guid Id, string Name, int TotalSeats, int HeldSeats, int ConfirmedSeats, TimeSpan? NextExpiryIn = null)
{
    public int AvailableSeats => TotalSeats - HeldSeats - ConfirmedSeats;
}
