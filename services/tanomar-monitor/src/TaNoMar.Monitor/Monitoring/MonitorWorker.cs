using TaNoMar.Monitor.Configuration;

namespace TaNoMar.Monitor.Monitoring;

public sealed class MonitorWorker(MonitorCoordinator coordinator, MonitoringOptions options, ILogger<MonitorWorker> logger) : BackgroundService
{
    private readonly int _intervalSeconds = options.IntervalSeconds;
    public bool IsOperational { get; private set; }
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("TaNoMar Monitor iniciado");
        IsOperational = true;
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await coordinator.RunAllAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception exception) { logger.LogError(exception, "Erro inesperado no ciclo de monitoramento"); }
            await Task.Delay(TimeSpan.FromSeconds(_intervalSeconds), stoppingToken);
        }
        IsOperational = false;
    }
}
