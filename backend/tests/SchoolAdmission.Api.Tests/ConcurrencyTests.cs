using System.Net;
using SchoolAdmission.Api.Tests.Infrastructure;

namespace SchoolAdmission.Api.Tests;

/// <summary>
/// The rule that must never break: held + confirmed &lt;= totalSeats, however many requests
/// arrive at once and however many backend processes serve them.
/// </summary>
public sealed class ConcurrencyTests(AdmissionTestHost host) : IClassFixture<AdmissionTestHost>
{
    private ApiClient Api => host.Api;

    [Fact]
    public async Task Many_simultaneous_applicants_never_get_more_holds_than_seats()
    {
        const int seats = 10, applicants = 200;
        var @class = await Api.CreateClassAsync("Rush", seats);

        var responses = await Task.WhenAll(
            Students.New(applicants).Select(student => Api.PlaceHoldAsync(@class.Id, student)));

        Assert.Equal(seats, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(applicants - seats, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));

        var after = await Api.GetClassAsync(@class.Id);
        Assert.Equal((seats, 0, 0), (after.HeldSeats, after.ConfirmedSeats, after.AvailableSeats));
    }

    [Fact]
    public async Task Two_backend_instances_sharing_one_database_never_oversell()
    {
        const int seats = 15, applicants = 300;
        var secondApi = await host.StartApiAsync();
        var @class = await Api.CreateClassAsync("Two processes", seats);

        // Alternate requests between the two instances; each has its own connection pool
        // and no shared memory, exactly like two separate processes.
        var responses = await Task.WhenAll(
            Students.New(applicants).Select((student, i) => (i % 2 == 0 ? Api : secondApi).PlaceHoldAsync(@class.Id, student)));

        Assert.Equal(seats, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(applicants - seats, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));

        foreach (var api in new[] { Api, secondApi })
        {
            var after = await api.GetClassAsync(@class.Id);
            Assert.Equal((seats, 0), (after.HeldSeats, after.AvailableSeats));
        }

        await host.StopApiAsync(secondApi);
    }

    [Fact]
    public async Task One_student_applying_many_times_at_once_gets_exactly_one_hold()
    {
        var @class = await Api.CreateClassAsync("Double click", 10);
        var student = Students.New();

        var responses = await Task.WhenAll(
            Enumerable.Range(0, 30).Select(_ => Api.PlaceHoldAsync(@class.Id, student)));

        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Created);
        Assert.Equal(29, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        Assert.Equal(1, (await Api.GetClassAsync(@class.Id)).HeldSeats);
        Assert.Single(await Api.ListMyHoldsAsync(student));
    }

    [Fact]
    public async Task Simultaneous_confirms_of_one_hold_count_the_seat_once()
    {
        var @class = await Api.CreateClassAsync("Double pay", 5);
        var student = Students.New();
        var hold = await Api.HoldSeatAsync(@class.Id, student);

        var responses = await Task.WhenAll(
            Enumerable.Range(0, 30).Select(_ => Api.ConfirmAsync(hold.HoldId, student)));

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
        var after = await Api.GetClassAsync(@class.Id);
        Assert.Equal((0, 1, 4), (after.HeldSeats, after.ConfirmedSeats, after.AvailableSeats));
    }

    [Fact]
    public async Task Confirm_and_cancel_racing_on_one_hold_leave_exactly_one_winner()
    {
        var @class = await Api.CreateClassAsync("Pay or cancel", 20);

        for (var round = 0; round < 20; round++)
        {
            var student = Students.New();
            var hold = await Api.HoldSeatAsync(@class.Id, student);

            var results = await Task.WhenAll(Api.ConfirmAsync(hold.HoldId, student), Api.CancelAsync(hold.HoldId, student));

            var status = (await Api.GetHoldAsync(hold.HoldId)).Status;
            var confirmWon = results[0].StatusCode == HttpStatusCode.OK;
            var cancelWon = results[1].StatusCode == HttpStatusCode.NoContent;
            Assert.True(confirmWon != cancelWon, $"confirm={results[0].StatusCode}, cancel={results[1].StatusCode}");
            Assert.Equal(confirmWon ? "CONFIRMED" : "CANCELLED", status);
        }

        var after = await Api.GetClassAsync(@class.Id);
        Assert.Equal(0, after.HeldSeats);
        Assert.Equal(20, after.ConfirmedSeats + after.AvailableSeats);
    }

    [Fact]
    public async Task Seat_limit_holds_while_applicants_keep_applying_paying_and_cancelling()
    {
        const int seats = 5, applicants = 60;
        var @class = await Api.CreateClassAsync("Churn", seats);
        using var stop = new CancellationTokenSource();
        var violations = new List<ClassDto>();

        // Watches the seat numbers the whole time the applicants are busy.
        var observer = Task.Run(async () =>
        {
            while (!stop.IsCancellationRequested)
            {
                var seen = await Api.GetClassAsync(@class.Id);
                if (seen.HeldSeats + seen.ConfirmedSeats > seen.TotalSeats || seen.AvailableSeats < 0)
                {
                    violations.Add(seen);
                }
            }
        });

        await Task.WhenAll(Students.New(applicants).Select(async (student, i) =>
        {
            for (var attempt = 0; attempt < 5; attempt++)
            {
                var response = await Api.PlaceHoldAsync(@class.Id, student);
                if (response.StatusCode != HttpStatusCode.Created)
                {
                    continue;
                }

                var hold = await response.ReadAsync<HoldDto>();
                if (i % 3 == 0)
                {
                    await Api.ConfirmAsync(hold.HoldId, student);
                    return;
                }

                await Api.CancelAsync(hold.HoldId, student);
            }
        }));

        stop.Cancel();
        await observer;

        Assert.Empty(violations);
        var after = await Api.GetClassAsync(@class.Id);
        Assert.Equal(0, after.HeldSeats);
        Assert.InRange(after.ConfirmedSeats, 1, seats);
        Assert.Equal(seats, after.ConfirmedSeats + after.AvailableSeats);
    }
}
