using System.Data.Common;
using System.Net.Sockets;

namespace SchoolAdmission.Api.Data;

/// <summary>Classifies database failures without depending on driver-specific exception types.</summary>
internal static class DatabaseErrors
{
    private const string ServerStartingUp = "57P03";
    private const string UniqueViolation = "23505";

    /// <summary>True when PostgreSQL could not be reached at all (down, starting, or network trouble).</summary>
    public static bool IsUnavailable(Exception exception) => exception switch
    {
        // A missing SQLSTATE means the failure happened before the server answered.
        DbException { SqlState: null or ServerStartingUp } => true,
        SocketException or TimeoutException or IOException => true,
        _ => false
    };

    public static bool IsUniqueViolation(DbException exception) => exception.SqlState == UniqueViolation;
}
