using System.Diagnostics.CodeAnalysis;

namespace SchoolAdmission.Api.Domain;

/// <summary>
/// A student's 17-digit birth registration number. It is the only identity the system
/// has, so it is validated once at the edge and passed around as a type, not a raw string.
/// </summary>
public readonly record struct StudentId
{
    public const int Length = 17;

    private StudentId(string value) => Value = value;

    public string Value { get; }

    public static bool TryParse([NotNullWhen(true)] string? raw, out StudentId studentId)
    {
        var candidate = raw?.Trim();
        if (candidate is { Length: Length } && candidate.All(char.IsAsciiDigit))
        {
            studentId = new StudentId(candidate);
            return true;
        }

        studentId = default;
        return false;
    }

    public override string ToString() => Value;
}
