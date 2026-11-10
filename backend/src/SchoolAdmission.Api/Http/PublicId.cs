namespace SchoolAdmission.Api.Http;

/// <summary>
/// Class and hold ids are UUIDs. A path segment that is not a UUID cannot name an existing
/// resource, so callers treat a failed parse exactly like "not found".
/// </summary>
internal static class PublicId
{
    public static bool TryParse(string? raw, out Guid id) => Guid.TryParseExact(raw, "D", out id);
}
