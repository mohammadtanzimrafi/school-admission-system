using SchoolAdmission.Api.Tests.Infrastructure;

namespace SchoolAdmission.Api.Tests;

public sealed class PersistenceTests(AdmissionTestHost host) : IClassFixture<AdmissionTestHost>
{
    [Fact]
    public async Task Classes_and_applications_survive_a_backend_restart()
    {
        var student = Students.New();
        var waiting = Students.New();

        var firstRun = await host.StartApiAsync();
        var @class = await firstRun.CreateClassAsync("Survivor", 3);
        var paid = await firstRun.HoldSeatAsync(@class.Id, student);
        await firstRun.ConfirmAsync(paid.HoldId, student);
        var pending = await firstRun.HoldSeatAsync(@class.Id, waiting);
        await host.StopApiAsync(firstRun);

        var secondRun = await host.StartApiAsync();

        var seats = await secondRun.GetClassAsync(@class.Id);
        Assert.Equal(("Survivor", 3, 1, 1, 1), (seats.Name, seats.TotalSeats, seats.HeldSeats, seats.ConfirmedSeats, seats.AvailableSeats));
        Assert.Equal("CONFIRMED", (await secondRun.GetHoldAsync(paid.HoldId)).Status);
        Assert.Equal(pending.HoldId, Assert.Single(await secondRun.ListMyHoldsAsync(waiting)).HoldId);
        await host.StopApiAsync(secondRun);
    }
}
