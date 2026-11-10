using System.Net;
using SchoolAdmission.Api.Tests.Infrastructure;

namespace SchoolAdmission.Api.Tests;

public sealed class HoldLifecycleTests(AdmissionTestHost host) : IClassFixture<AdmissionTestHost>
{
    private ApiClient Api => host.Api;

    [Fact]
    public async Task Applying_holds_a_seat_for_the_student()
    {
        var @class = await Api.CreateClassAsync("Apply", 3);
        var student = Students.New();
        var before = DateTimeOffset.UtcNow;

        var hold = await Api.HoldSeatAsync(@class.Id, student);

        Assert.False(string.IsNullOrWhiteSpace(hold.HoldId));
        Assert.Equal(@class.Id, hold.ClassId);
        Assert.Equal(student, hold.StudentId);
        Assert.Equal("HELD", hold.Status);
        Assert.InRange(hold.ExpiresAt, before.AddSeconds(595), DateTimeOffset.UtcNow.AddSeconds(605));

        var seats = await Api.GetClassAsync(@class.Id);
        Assert.Equal((1, 0, 2), (seats.HeldSeats, seats.ConfirmedSeats, seats.AvailableSeats));

        var fetched = await Api.GetHoldAsync(hold.HoldId);
        Assert.Equal((hold.HoldId, @class.Id, "HELD", hold.ExpiresAt), (fetched.HoldId, fetched.ClassId, fetched.Status, fetched.ExpiresAt));
    }

    [Fact]
    public async Task Applying_needs_a_valid_17_digit_student_id()
    {
        var @class = await Api.CreateClassAsync("Identity", 3);

        var missing = await Api.PlaceHoldAsync(@class.Id, studentId: null);
        Assert.Equal(HttpStatusCode.BadRequest, missing.StatusCode);
        Assert.Equal("STUDENT_ID_REQUIRED", (await missing.ReadProblemAsync()).Code);

        foreach (var malformed in new[] { "123", "2015269123456789A", "201526912345678901" })
        {
            var response = await Api.PlaceHoldAsync(@class.Id, malformed);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal("STUDENT_ID_INVALID", (await response.ReadProblemAsync()).Code);
        }

        Assert.Equal(0, (await Api.GetClassAsync(@class.Id)).HeldSeats);
    }

    [Fact]
    public async Task Applying_to_a_full_class_returns_409()
    {
        var @class = await Api.CreateClassAsync("Full", 1);
        await Api.HoldSeatAsync(@class.Id, Students.New());

        var response = await Api.PlaceHoldAsync(@class.Id, Students.New());

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("CLASS_FULL", (await response.ReadProblemAsync()).Code);
    }

    [Fact]
    public async Task Applying_to_an_unknown_class_returns_404()
    {
        var response = await Api.PlaceHoldAsync(Guid.NewGuid().ToString(), Students.New());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task A_student_cannot_hold_two_seats_in_the_same_class_but_may_apply_to_another()
    {
        var morning = await Api.CreateClassAsync("Morning", 5);
        var day = await Api.CreateClassAsync("Day", 5);
        var student = Students.New();
        var first = await Api.HoldSeatAsync(morning.Id, student);

        var duplicate = await Api.PlaceHoldAsync(morning.Id, student);
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        Assert.Equal("ALREADY_APPLIED", (await duplicate.ReadProblemAsync()).Code);

        // Still blocked once the first application is confirmed.
        await Api.ConfirmAsync(first.HoldId, student);
        var afterConfirm = await Api.PlaceHoldAsync(morning.Id, student);
        Assert.Equal(HttpStatusCode.Conflict, afterConfirm.StatusCode);

        await Api.HoldSeatAsync(day.Id, student);
        Assert.Equal(1, (await Api.GetClassAsync(morning.Id)).ConfirmedSeats);
        Assert.Equal(1, (await Api.GetClassAsync(day.Id)).HeldSeats);
    }

    [Fact]
    public async Task Paying_the_fee_confirms_the_admission()
    {
        var @class = await Api.CreateClassAsync("Confirm", 2);
        var student = Students.New();
        var hold = await Api.HoldSeatAsync(@class.Id, student);

        var response = await Api.ConfirmAsync(hold.HoldId, student);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var confirmed = await response.ReadAsync<HoldDto>();
        Assert.Equal((hold.HoldId, "CONFIRMED"), (confirmed.HoldId, confirmed.Status));

        var seats = await Api.GetClassAsync(@class.Id);
        Assert.Equal((0, 1, 1), (seats.HeldSeats, seats.ConfirmedSeats, seats.AvailableSeats));
        Assert.Equal("CONFIRMED", (await Api.GetHoldAsync(hold.HoldId)).Status);
    }

    [Fact]
    public async Task Confirming_twice_counts_the_seat_once()
    {
        var @class = await Api.CreateClassAsync("Confirm twice", 2);
        var student = Students.New();
        var hold = await Api.HoldSeatAsync(@class.Id, student);

        var first = await Api.ConfirmAsync(hold.HoldId, student);
        var second = await Api.ConfirmAsync(hold.HoldId, student);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(1, (await Api.GetClassAsync(@class.Id)).ConfirmedSeats);
    }

    [Fact]
    public async Task Only_the_owner_can_confirm_or_cancel_a_hold()
    {
        var @class = await Api.CreateClassAsync("Ownership", 2);
        var owner = Students.New();
        var stranger = Students.New();
        var hold = await Api.HoldSeatAsync(@class.Id, owner);

        var confirm = await Api.ConfirmAsync(hold.HoldId, stranger);
        var cancel = await Api.CancelAsync(hold.HoldId, stranger);

        Assert.Equal(HttpStatusCode.Forbidden, confirm.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, cancel.StatusCode);
        Assert.Equal("HELD", (await Api.GetHoldAsync(hold.HoldId)).Status);
    }

    [Fact]
    public async Task Cancelling_frees_the_seat_for_someone_else()
    {
        var @class = await Api.CreateClassAsync("Cancel", 1);
        var student = Students.New();
        var hold = await Api.HoldSeatAsync(@class.Id, student);

        var response = await Api.CancelAsync(hold.HoldId, student);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("CANCELLED", (await Api.GetHoldAsync(hold.HoldId)).Status);
        Assert.Equal(1, (await Api.GetClassAsync(@class.Id)).AvailableSeats);

        // Repeating the cancel is harmless, but a cancelled hold can no longer be paid for.
        Assert.Equal(HttpStatusCode.NoContent, (await Api.CancelAsync(hold.HoldId, student)).StatusCode);
        var confirm = await Api.ConfirmAsync(hold.HoldId, student);
        Assert.Equal(HttpStatusCode.Conflict, confirm.StatusCode);
        Assert.Equal("HOLD_CANCELLED", (await confirm.ReadProblemAsync()).Code);

        // The seat is genuinely free again, including for the same student.
        await Api.HoldSeatAsync(@class.Id, student);
    }

    [Fact]
    public async Task A_confirmed_admission_cannot_be_cancelled()
    {
        var @class = await Api.CreateClassAsync("Final", 1);
        var student = Students.New();
        var hold = await Api.HoldSeatAsync(@class.Id, student);
        await Api.ConfirmAsync(hold.HoldId, student);

        var response = await Api.CancelAsync(hold.HoldId, student);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("HOLD_ALREADY_CONFIRMED", (await response.ReadProblemAsync()).Code);
        Assert.Equal(1, (await Api.GetClassAsync(@class.Id)).ConfirmedSeats);
    }

    [Fact]
    public async Task Unknown_hold_returns_404()
    {
        var student = Students.New();
        var missing = Guid.NewGuid().ToString();

        Assert.Equal(HttpStatusCode.NotFound, (await Api.GetAsync($"/holds/{missing}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Api.GetAsync("/holds/h_789")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Api.ConfirmAsync(missing, student)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Api.CancelAsync(missing, student)).StatusCode);
    }

    [Fact]
    public async Task My_holds_lists_only_my_applications_newest_first()
    {
        var first = await Api.CreateClassAsync("Mine A", 3);
        var second = await Api.CreateClassAsync("Mine B", 3);
        var me = Students.New();
        var holdA = await Api.HoldSeatAsync(first.Id, me);
        var holdB = await Api.HoldSeatAsync(second.Id, me);
        await Api.HoldSeatAsync(first.Id, Students.New());
        await Api.ConfirmAsync(holdA.HoldId, me);

        var mine = await Api.ListMyHoldsAsync(me);

        Assert.Equal(2, mine.Count);
        Assert.Equal((holdB.HoldId, second.Id, "Mine B", "HELD"), (mine[0].HoldId, mine[0].ClassId, mine[0].ClassName, mine[0].Status));
        Assert.Equal((holdA.HoldId, first.Id, "Mine A", "CONFIRMED"), (mine[1].HoldId, mine[1].ClassId, mine[1].ClassName, mine[1].Status));
        Assert.Empty(await Api.ListMyHoldsAsync(Students.New()));
    }
}
