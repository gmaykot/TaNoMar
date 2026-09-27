namespace TaNoMar.Api.Billing;

internal sealed class BillingCancellationWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<BillingCancellationWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var billing = scope.ServiceProvider.GetRequiredService<BillingService>();
                await billing.ProcessPendingCancellationsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Falha ao processar cancelamentos pendentes do Asaas.");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }
}
