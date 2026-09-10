using Microsoft.Extensions.Options;
using TaNoMar.Api.Workers;

namespace TaNoMar.Api.Fishing;

internal sealed class FishingForecastWarmupWorker(
    IServiceScopeFactory scopeFactory,
    IOptions<FishingOptions> options,
    WorkerSettingsService workerSettings,
    ILogger<FishingForecastWarmupWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var fishing = options.Value;
        var startupDelay = TimeSpan.FromSeconds(Math.Max(0, fishing.WarmupStartupDelaySeconds));
        if (startupDelay > TimeSpan.Zero)
            await Task.Delay(startupDelay, stoppingToken);

        if ((await workerSettings.GetAsync(WorkerCatalog.ForecastWarmup, stoppingToken)).IsEnabled)
            await WarmOnceAsync(stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            await workerSettings.WaitForNextRunAsync(WorkerCatalog.ForecastWarmup, stoppingToken);
            await WarmOnceAsync(stoppingToken);
        }
    }

    private async Task WarmOnceAsync(CancellationToken cancellationToken)
    {
        var started = DateTimeOffset.UtcNow;
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var fishing = scope.ServiceProvider.GetRequiredService<FishingForecastService>();
            var result = await fishing.QueuePublicSpotsAsync(cancellationToken);
            logger.LogInformation(
                "Aquecimento agendado: {Locations} locais, {Queued} incluídos na fila, em {Elapsed}s.",
                result.Locations,
                result.Queued,
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
