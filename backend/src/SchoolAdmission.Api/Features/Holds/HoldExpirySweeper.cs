using SchoolAdmission.Api.Configuration;
using SchoolAdmission.Api.Data;

namespace SchoolAdmission.Api.Features.Holds;

/// <summary>
/// Housekeeping only. A seat is free the instant its hold passes expires_at, because every
/// query compares against the clock; nothing waits for this job. The sweeper just writes
/// the EXPIRED status down so the stored data matches what the API already reports and
/// the "active holds" index stays small.
/// </summary>
public sealed class HoldExpirySweeper(
    HoldRepository holds,
    AdmissionOptions options,
    ILogger<HoldExpirySweeper> logger) : BackgroundService
{
    private const int BatchSize = 1000;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(options.SweepInterval);
        try
        {
            do
            {
                await SweepAsync(stoppingToken);
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown.
        }
    }

    private async Task SweepAsync(CancellationToken ct)
    {
        try
        {
            int swept, total = 0;
            do
            {
                swept = await holds.SweepLapsedAsync(BatchSize, ct);
                total += swept;
            }
            while (swept == BatchSize);

            if (total > 0)
            {
                logger.LogInformation("Marked {Count} lapsed hold(s) as EXPIRED", total);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // A failed sweep must not take the process down; the next tick retries.
            logger.LogWarning(ex, "Hold expiry sweep failed; will retry in {Interval}", options.SweepInterval);
        }
    }
}
