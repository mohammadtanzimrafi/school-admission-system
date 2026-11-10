namespace SchoolAdmission.Api.Domain;

/// <summary>
/// Lifecycle of an application. The same upper-case names are stored in the database
/// and returned by the API.
/// <code>
/// HELD ──pay fee──▶ CONFIRMED
///   ├───cancel────▶ CANCELLED
///   └───time out──▶ EXPIRED
/// </code>
/// Only HELD can move; the other three are final.
/// </summary>
public static class HoldStatus
{
    public const string Held = "HELD";
    public const string Confirmed = "CONFIRMED";
    public const string Expired = "EXPIRED";
    public const string Cancelled = "CANCELLED";
}
