using Microsoft.EntityFrameworkCore;
using TaNoMar.Monitor.Configuration;
using TaNoMar.Monitor.Persistence;

namespace TaNoMar.Monitor.Monitoring;

public sealed class MonitorCoordinator(
    IDbContextFactory<MonitorDbContext> dbFactory,
    IEnumerable<IMonitorCheck> checks,
    IAlertSender alerts,
    MonitoringOptions monitoring,
    AlertOptions alertOptions,
    ILogger<MonitorCoordinator> logger)
{
    private readonly SemaphoreSlim _roundLock = new(1, 1);

    public async Task RunCheckAsync(IMonitorCheck check, CancellationToken cancellationToken)
    {
        var result = await check.ExecuteAsync(cancellationToken);
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        var state = await db.Checks.SingleOrDefaultAsync(x => x.Name == check.Name, cancellationToken)
            ?? new MonitorCheckState { Name = check.Name, Status = CheckStatus.Unknown };
        var oldStatus = state.Status;
        var now = DateTimeOffset.UtcNow;
        state.LastCheckAt = now;
        state.LastLatencyMs = result.LatencyMs;

        if (result.Success)
        {
            state.ConsecutiveFailures = 0;
            state.ConsecutiveSuccesses++;
            state.LastSuccessAt = now;
            state.LastError = null;
            if (state.Status == CheckStatus.Down && state.ConsecutiveSuccesses >= monitoring.RecoveryThreshold)
            {
                state.Status = CheckStatus.Healthy;
                state.RecoveryAlertSent = false;
                await SaveAsync(db, state, cancellationToken);
                await TryRecoveryAlertAsync(db, state, cancellationToken);
                logger.LogInformation("Check {Check} mudou de Down para Healthy", check.Name);
            }
            else if (state.Status == CheckStatus.Unknown)
            {
                state.Status = CheckStatus.Healthy;
                await SaveAsync(db, state, cancellationToken);
            }
            else
            {
                await TryRecoveryAlertAsync(db, state, cancellationToken);
                await SaveAsync(db, state, cancellationToken);
            }
        }
        else
        {
            state.ConsecutiveSuccesses = 0;
            state.ConsecutiveFailures++;
            state.LastFailureAt = now;
            state.LastError = result.Error;
            if (state.Status != CheckStatus.Down && state.ConsecutiveFailures >= monitoring.FailureThreshold)
            {
                state.Status = CheckStatus.Down;
                state.OutageStartedAt = now;
                state.DownAlertSent = false;
                state.DownAlertAttempts = 0;
                state.LastDownAlertAttemptAt = null;
                state.RecoveryAlertSent = false;
                state.RecoveryAlertAttempts = 0;
                state.LastRecoveryAlertAttemptAt = null;
                logger.LogWarning("Check {Check} mudou para Down", check.Name);
            }
            await SaveAsync(db, state, cancellationToken);
            if (state.Status == CheckStatus.Down)
                await TryDownAlertAsync(db, state, check.Url, cancellationToken);
        }

        if (oldStatus != state.Status)
            logger.LogInformation("Check {Check}: {OldStatus} -> {NewStatus}", check.Name, oldStatus, state.Status);
    }

    public async Task<IReadOnlyList<MonitorCheckState>> GetStatesAsync(CancellationToken cancellationToken)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        return await db.Checks.AsNoTracking().OrderBy(x => x.Name).ToListAsync(cancellationToken);
    }

    public async Task RunAllAsync(CancellationToken cancellationToken)
    {
        await _roundLock.WaitAsync(cancellationToken);
        try
        {
            foreach (var check in checks)
                await RunCheckAsync(check, cancellationToken);
        }
        finally { _roundLock.Release(); }
    }

    private async Task TryDownAlertAsync(MonitorDbContext db, MonitorCheckState state, string url, CancellationToken cancellationToken)
    {
        if (state.DownAlertSent || !CanRetry(state.DownAlertAttempts, state.LastDownAlertAttemptAt)) return;
        state.DownAlertAttempts++;
        state.LastDownAlertAttemptAt = DateTimeOffset.UtcNow;
        await SaveAsync(db, state, cancellationToken);
        var result = await alerts.SendDownAsync(state, url, cancellationToken);
        if (result.Succeeded) state.DownAlertSent = true;
        else if (!result.Retryable) state.DownAlertAttempts = alertOptions.MaxRetryAttempts + 1;
        await SaveAsync(db, state, cancellationToken);
        logger.LogWarning("Alerta DOWN para {Check}: sucesso={Success}, retryable={Retryable}, tentativa={Attempt}", state.Name, result.Succeeded, result.Retryable, state.DownAlertAttempts);
    }

    private async Task TryRecoveryAlertAsync(MonitorDbContext db, MonitorCheckState state, CancellationToken cancellationToken)
    {
        if (state.Status != CheckStatus.Healthy || state.RecoveryAlertSent || state.OutageStartedAt is null || !CanRetry(state.RecoveryAlertAttempts, state.LastRecoveryAlertAttemptAt)) return;
        state.RecoveryAlertAttempts++;
        state.LastRecoveryAlertAttemptAt = DateTimeOffset.UtcNow;
        await SaveAsync(db, state, cancellationToken);
        var result = await alerts.SendRecoveryAsync(state, cancellationToken);
        if (result.Succeeded)
        {
            state.RecoveryAlertSent = true;
            state.OutageStartedAt = null;
        }
        else if (!result.Retryable) state.RecoveryAlertAttempts = alertOptions.MaxRetryAttempts + 1;
        await SaveAsync(db, state, cancellationToken);
        logger.LogWarning("Alerta RECOVERY para {Check}: sucesso={Success}, retryable={Retryable}, tentativa={Attempt}", state.Name, result.Succeeded, result.Retryable, state.RecoveryAlertAttempts);
    }

    private bool CanRetry(int attempts, DateTimeOffset? lastAttempt)
        => attempts == 0 || (alertOptions.RetryEnabled && attempts <= alertOptions.MaxRetryAttempts && lastAttempt is not null && DateTimeOffset.UtcNow - lastAttempt.Value >= TimeSpan.FromSeconds(alertOptions.RetryIntervalSeconds));

    private static async Task SaveAsync(MonitorDbContext db, MonitorCheckState state, CancellationToken cancellationToken)
    {
        if (db.Entry(state).State == EntityState.Detached) db.Checks.Add(state);
        await db.SaveChangesAsync(cancellationToken);
    }
}
