using Microsoft.EntityFrameworkCore;
using TaNoMar.Api.Data;

namespace TaNoMar.Api.Billing;

internal sealed class BillingPeriodWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<BillingPeriodWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        await RunAsync(stoppingToken);
        while (await timer.WaitForNextTickAsync(stoppingToken))
            await RunAsync(stoppingToken);
    }

    private async Task RunAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            var billing = scope.ServiceProvider.GetRequiredService<BillingService>();
            var users = await db.Users.Where(item => item.IsActive).ToListAsync(cancellationToken);
            foreach (var user in users)
                await billing.ApplyDueAccessAsync(user, cancellationToken);
            await billing.SyncCatalogPricesAsync(null, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Falha ao atualizar assinaturas.");
        }
    }
}
