using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Builder;

namespace SchoolAdmission.Api.Tests.Infrastructure;

public sealed record ClassDto(string Id, string Name, int TotalSeats, int HeldSeats, int ConfirmedSeats, int AvailableSeats);

public sealed record HoldDto(string HoldId, string ClassId, string? ClassName, string? StudentId, string Status, DateTimeOffset ExpiresAt);

public sealed record ProblemDto(int Status, string Code, string? Detail);

/// <summary>A thin, typed wrapper over the HTTP contract so tests read like the brief.</summary>
public sealed class ApiClient(HttpClient http, WebApplication app)
{
    private const string StudentHeader = "X-Student-Id";

    internal HttpClient Http => http;
    internal WebApplication App => app;

    public Task<HttpResponseMessage> PostClassAsync(object body) => http.PostAsJsonAsync("/classes", body);

    public async Task<ClassDto> CreateClassAsync(string name, int totalSeats)
    {
        var response = await PostClassAsync(new { name, totalSeats });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.ReadAsync<ClassDto>();
    }

    public async Task<ClassDto> GetClassAsync(string classId) =>
        (await http.GetFromJsonAsync<ClassDto>($"/classes/{classId}"))!;

    public async Task<List<ClassDto>> ListClassesAsync() =>
        (await http.GetFromJsonAsync<List<ClassDto>>("/classes"))!;

    public Task<HttpResponseMessage> GetAsync(string path) => http.GetAsync(path);

    public Task<HttpResponseMessage> PlaceHoldAsync(string classId, string? studentId) =>
        SendAsync(HttpMethod.Post, $"/classes/{classId}/holds", studentId);

    /// <summary>Places a hold that is expected to succeed.</summary>
    public async Task<HoldDto> HoldSeatAsync(string classId, string studentId)
    {
        var response = await PlaceHoldAsync(classId, studentId);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.ReadAsync<HoldDto>();
    }

    public async Task<HoldDto> GetHoldAsync(string holdId) =>
        (await http.GetFromJsonAsync<HoldDto>($"/holds/{holdId}"))!;

    public Task<HttpResponseMessage> ConfirmAsync(string holdId, string? studentId) =>
        SendAsync(HttpMethod.Post, $"/holds/{holdId}/confirm", studentId);

    public Task<HttpResponseMessage> CancelAsync(string holdId, string? studentId) =>
        SendAsync(HttpMethod.Delete, $"/holds/{holdId}", studentId);

    public async Task<List<HoldDto>> ListMyHoldsAsync(string studentId)
    {
        var response = await SendAsync(HttpMethod.Get, "/me/holds", studentId);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadAsync<List<HoldDto>>();
    }

    private Task<HttpResponseMessage> SendAsync(HttpMethod method, string path, string? studentId)
    {
        var request = new HttpRequestMessage(method, path);
        if (studentId is not null)
        {
            request.Headers.Add(StudentHeader, studentId);
        }

        return http.SendAsync(request);
    }
}

public static class HttpResponseExtensions
{
    public static async Task<T> ReadAsync<T>(this HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<T>())!;

    public static Task<ProblemDto> ReadProblemAsync(this HttpResponseMessage response) =>
        response.ReadAsync<ProblemDto>();
}

public static class Students
{
    private static long _sequence = Random.Shared.NextInt64(1, 1_000_000_000);

    /// <summary>A fresh, valid 17-digit birth registration number.</summary>
    public static string New() => $"2015{Interlocked.Increment(ref _sequence):D13}";

    public static string[] New(int count) => Enumerable.Range(0, count).Select(_ => New()).ToArray();
}
