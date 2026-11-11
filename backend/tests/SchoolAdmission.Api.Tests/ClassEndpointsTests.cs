using System.Net;
using System.Net.Http.Json;
using SchoolAdmission.Api.Tests.Infrastructure;

namespace SchoolAdmission.Api.Tests;

public sealed class ClassEndpointsTests(AdmissionTestHost host) : IClassFixture<AdmissionTestHost>
{
    private ApiClient Api => host.Api;

    [Fact]
    public async Task Creating_a_class_returns_201_and_the_class_starts_empty()
    {
        var response = await Api.PostClassAsync(new { name = "Class 6 - Morning Shift", totalSeats = 120 });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.ReadAsync<ClassDto>();
        Assert.False(string.IsNullOrWhiteSpace(created.Id));
        Assert.Equal("Class 6 - Morning Shift", created.Name);
        Assert.Equal(120, created.TotalSeats);

        var fetched = await Api.GetClassAsync(created.Id);
        Assert.Equal(new ClassDto(created.Id, "Class 6 - Morning Shift", 120, 0, 0, 120), fetched);
    }

    [Fact]
    public async Task Settings_report_the_configured_hold_duration()
    {
        var shortHolds = await host.StartApiAsync(holdDurationSeconds: 45);

        var settings = await shortHolds.Http.GetFromJsonAsync<Dictionary<string, int>>("/settings");

        Assert.Equal(45, settings!["holdDurationSeconds"]);
        await host.StopApiAsync(shortHolds);
    }

    [Fact]
    public async Task Each_shift_is_its_own_class_with_its_own_seats()
    {
        var morning = await Api.CreateClassAsync("Class 7 - Morning Shift", 2);
        var day = await Api.CreateClassAsync("Class 7 - Day Shift", 5);
        var student = Students.New();

        await Api.HoldSeatAsync(morning.Id, student);

        var classes = await Api.ListClassesAsync();
        Assert.Equal(1, classes.Single(c => c.Id == morning.Id).HeldSeats);
        Assert.Equal(1, classes.Single(c => c.Id == morning.Id).AvailableSeats);
        Assert.Equal(0, classes.Single(c => c.Id == day.Id).HeldSeats);
        Assert.Equal(5, classes.Single(c => c.Id == day.Id).AvailableSeats);
    }

    [Fact]
    public async Task Invalid_class_input_is_rejected_with_400()
    {
        object[] invalidBodies =
        [
            new { name = "", totalSeats = 10 },
            new { name = "   ", totalSeats = 10 },
            new { name = "Class 8", totalSeats = 0 },
            new { name = "Class 8", totalSeats = -5 },
            new { name = "Class 8" },
            new { totalSeats = 10 },
            new { name = new string('x', 101), totalSeats = 10 }
        ];

        foreach (var body in invalidBodies)
        {
            var response = await Api.PostClassAsync(body);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal("VALIDATION_FAILED", (await response.ReadProblemAsync()).Code);
        }
    }

    [Fact]
    public async Task Unknown_class_returns_404()
    {
        foreach (var path in new[] { $"/classes/{Guid.NewGuid()}", "/classes/not-an-id" })
        {
            var response = await Api.GetAsync(path);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.Equal("CLASS_NOT_FOUND", (await response.ReadProblemAsync()).Code);
        }
    }
}
