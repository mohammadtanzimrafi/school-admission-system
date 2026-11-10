using System.Net;
using SchoolAdmission.Api.Tests.Infrastructure;

namespace SchoolAdmission.Api.Tests;

/// <summary>
/// Runs against an API instance whose holds last two seconds, so expiry can be observed
/// for real instead of being simulated.
/// </summary>
public sealed class HoldExpiryTests(AdmissionTestHost host) : IClassFixture<AdmissionTestHost>, IAsyncLifetime
{
    private const int HoldSeconds = 2;
    private static readonly TimeSpan PastExpiry = TimeSpan.FromSeconds(HoldSeconds + 0.5);

    private ApiClient _api = null!;

    public async Task InitializeAsync() => _api = await host.StartApiAsync(HoldSeconds);

    public Task DisposeAsync() => host.StopApiAsync(_api);

    [Fact]
    public async Task Hold_duration_comes_from_configuration()
    {
        var @class = await _api.CreateClassAsync("Configured duration", 1);
        var before = DateTimeOffset.UtcNow;

        var hold = await _api.HoldSeatAsync(@class.Id, Students.New());

        Assert.InRange(hold.ExpiresAt, before.AddSeconds(HoldSeconds - 1), DateTimeOffset.UtcNow.AddSeconds(HoldSeconds + 1));
    }

    [Fact]
    public async Task An_unpaid_hold_expires_and_its_seat_returns_without_any_api_call()
    {
        var @class = await _api.CreateClassAsync("Expiry", 1);
        var hold = await _api.HoldSeatAsync(@class.Id, Students.New());
        Assert.Equal(0, (await _api.GetClassAsync(@class.Id)).AvailableSeats);

        await Task.Delay(PastExpiry);

        var seats = await _api.GetClassAsync(@class.Id);
        Assert.Equal((0, 0, 1), (seats.HeldSeats, seats.ConfirmedSeats, seats.AvailableSeats));
        Assert.Equal("EXPIRED", (await _api.GetHoldAsync(hold.HoldId)).Status);

        // The released seat can be taken by the next applicant.
        await _api.HoldSeatAsync(@class.Id, Students.New());
    }

    [Fact]
    public async Task An_expired_hold_cannot_be_confirmed_or_cancelled()
    {
        var @class = await _api.CreateClassAsync("Too late", 1);
        var student = Students.New();
        var hold = await _api.HoldSeatAsync(@class.Id, student);

        await Task.Delay(PastExpiry);

        var confirm = await _api.ConfirmAsync(hold.HoldId, student);
        Assert.Equal(HttpStatusCode.Conflict, confirm.StatusCode);
        Assert.Equal("HOLD_EXPIRED", (await confirm.ReadProblemAsync()).Code);

        var cancel = await _api.CancelAsync(hold.HoldId, student);
        Assert.Equal(HttpStatusCode.Conflict, cancel.StatusCode);

        var seats = await _api.GetClassAsync(@class.Id);
        Assert.Equal((0, 0), (seats.HeldSeats, seats.ConfirmedSeats));
        Assert.Equal("EXPIRED", (await _api.GetHoldAsync(hold.HoldId)).Status);
    }

    [Fact]
    public async Task A_student_can_apply_again_after_their_hold_expired()
    {
        var @class = await _api.CreateClassAsync("Second chance", 1);
        var student = Students.New();
        var first = await _api.HoldSeatAsync(@class.Id, student);

        await Task.Delay(PastExpiry);
        var second = await _api.HoldSeatAsync(@class.Id, student);

        Assert.NotEqual(first.HoldId, second.HoldId);
        var mine = await _api.ListMyHoldsAsync(student);
        Assert.Equal("HELD, EXPIRED", string.Join(", ", mine.Select(h => h.Status)));
    }

    [Fact]
    public async Task A_confirmed_admission_never_expires()
    {
        var @class = await _api.CreateClassAsync("Paid in time", 1);
        var student = Students.New();
        var hold = await _api.HoldSeatAsync(@class.Id, student);
        await _api.ConfirmAsync(hold.HoldId, student);

        await Task.Delay(PastExpiry);

        Assert.Equal("CONFIRMED", (await _api.GetHoldAsync(hold.HoldId)).Status);
        var seats = await _api.GetClassAsync(@class.Id);
        Assert.Equal((0, 1, 0), (seats.HeldSeats, seats.ConfirmedSeats, seats.AvailableSeats));
    }
}
