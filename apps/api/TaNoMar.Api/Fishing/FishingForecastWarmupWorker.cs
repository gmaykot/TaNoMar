using Microsoft.Extensions.Options;

namespace TaNoMar.Api.Fishing;

internal sealed class FishingForecastWarmupWorker(
    IServiceScopeFactory scopeFactory,
    IOptions<FishingOptions> options,
    ILogger<FishingForecastWarmupWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var fishing = options.Value;
        if (!fishing.WarmupEnabled)
        {
            logger.LogInformation("Worker de previsão desligado (Fishing:WarmupEnabled=false).");
            return;
        }

        var startupDelay = TimeSpan.FromSeconds(Math.Max(0, fishing.WarmupStartupDelaySeconds));
        if (startupDelay > TimeSpan.Zero)
            await Task.Delay(startupDelay, stoppingToken);

        var intervalHours = fishing.WarmupIntervalHours > 0
            ? fishing.WarmupIntervalHours
            : Math.Max(1, fishing.CacheHours / 2);
        using var timer = new PeriodicTimer(TimeSpan.FromHours(intervalHours));

        await WarmOnceAsync(stoppingToken);

        while (await timer.WaitForNextTickAsync(stoppingToken))
            await WarmOnceAsync(stoppingToken);
    }

    private async Task WarmOnceAsync(CancellationToken cancellationToken)
    {
        var started = DateTimeOffset.UtcNow;
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var fishing = scope.ServiceProvider.GetRequiredService<FishingForecastService>();
            var result = await fishing.WarmPublicSpotsAsync(cancellationToken);
            logger.LogInformation(
                "Previsão aquecida: {Locations} locais, {Refreshed} atualizados, {Reused} já em cache, {Failed} falhas, em {Elapsed}s.",
                result.Locations,
                result.Refreshed,
                result.Reused,
                result.Failed,
                (DateTimeOffset.UtcNow - started).TotalSeconds.ToString("0.0"));
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Falha ao aquecer previsões após {Elapsed}s.", (DateTimeOffset.UtcNow - started).TotalSeconds.ToString("0.0"));
        }
    }
}
