using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using TaNoMar.Api.Data;

namespace TaNoMar.Api.Billing;

internal static class BillingCancellationStatus
{
    public const string Pending = "pending";
    public const string Confirmed = "confirmed";
    public const string ActionRequired = "action_required";
}

internal static class BillingCancellationReason
{
    public const string UserRequest = "user_request";
    public const string AccountDeletion = "account_deletion";
    public const string AdminAccountDeletion = "admin_account_deletion";
    public const string LegacyReconciliation = "legacy_reconciliation";
}

internal sealed class BillingCancellationService(
    TaNoMarDbContext db,
    IAsaasClient asaas,
    ILogger<BillingCancellationService> logger)
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> Gates = new(StringComparer.Ordinal);

    public async Task<BillingCancellation> RequestAsync(
        Guid userId,
        BillingSubscription? subscription,
        string asaasSubscriptionId,
        string reason,
        bool manualRetry,
        CancellationToken cancellationToken)
    {
        var request = await EnsureAsync(userId, subscription?.Id, asaasSubscriptionId, reason, cancellationToken);
        return await AttemptAsync(request.Id, manualRetry, cancellationToken);
    }

    public async Task<List<BillingCancellation>> EnsureAccountDeletionRequestsAsync(
        Guid userId,
        IReadOnlyCollection<BillingSubscription> subscriptions,
        string reason,
        CancellationToken cancellationToken)
    {
        var requests = new List<BillingCancellation>();
        foreach (var subscription in subscriptions)
        {
            var remoteIds = new[] { subscription.AsaasSubscriptionId, subscription.PreviousAsaasSubscriptionId }
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value!)
                .Distinct(StringComparer.Ordinal);
            foreach (var remoteId in remoteIds)
                requests.Add(await EnsureAsync(userId, subscription.Id, remoteId, reason, cancellationToken));
        }
        return requests.DistinctBy(item => item.AsaasSubscriptionId, StringComparer.Ordinal).ToList();
    }

    public async Task<BillingCancellation> AttemptAsync(Guid requestId, bool manualRetry, CancellationToken cancellationToken)
    {
        var request = await db.BillingCancellations.SingleAsync(item => item.Id == requestId, cancellationToken);
        if (request.Status == BillingCancellationStatus.Confirmed)
            return request;

        var gate = Gates.GetOrAdd(request.AsaasSubscriptionId, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            await db.Entry(request).ReloadAsync(cancellationToken);
            if (request.Status == BillingCancellationStatus.Confirmed)
                return request;

            AsaasCancellationOutcome outcome;
            try
            {
                outcome = await asaas.CancelSubscriptionAsync(request.AsaasSubscriptionId, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Falha inesperada ao cancelar assinatura no Asaas.");
                outcome = AsaasCancellationOutcome.Pending;
            }

            await db.Entry(request).ReloadAsync(cancellationToken);
            if (request.Status == BillingCancellationStatus.Confirmed)
                return request;

            var now = DateTimeOffset.UtcNow;
            request.AttemptCount += 1;
            request.LastAttemptAt = now;
            request.UpdatedAt = now;
            request.ConcurrencyToken = Guid.NewGuid();
            switch (outcome)
            {
                case AsaasCancellationOutcome.Confirmed:
                    Confirm(request, now);
                    await MarkLocalSubscriptionCanceledAsync(request.AsaasSubscriptionId, now, cancellationToken);
                    break;
                case AsaasCancellationOutcome.ActionRequired:
                    RequireAction(request, now, "asaas_rejected");
                    logger.LogWarning("Cancelamento Asaas {CancellationId} exige ação operacional.", request.Id);
                    break;
                default:
                    if (request.AttemptCount >= BillingOptions.CancellationMaxAutomaticAttempts)
                    {
                        RequireAction(request, now, "retry_limit");
                        logger.LogWarning("Cancelamento Asaas {CancellationId} atingiu o limite de tentativas rápidas.", request.Id);
                    }
                    else
                    {
                        request.Status = BillingCancellationStatus.Pending;
                        request.LastFailureCode = "asaas_unconfirmed";
                        request.NextAttemptAt = now.AddMinutes(BillingOptions.CancellationRetryMinutes);
                        request.ActionRequiredAt = null;
                    }
                    break;
            }

            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                await db.Entry(request).ReloadAsync(cancellationToken);
            }
            return request;
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task ConfirmFromWebhookAsync(string asaasSubscriptionId, CancellationToken cancellationToken)
    {
        var request = await db.BillingCancellations
            .SingleOrDefaultAsync(item => item.AsaasSubscriptionId == asaasSubscriptionId, cancellationToken);
        if (request is null || request.Status == BillingCancellationStatus.Confirmed)
            return;
        var now = DateTimeOffset.UtcNow;
        Confirm(request, now);
        request.ConcurrencyToken = Guid.NewGuid();
        await MarkLocalSubscriptionCanceledAsync(asaasSubscriptionId, now, cancellationToken);
    }

    public Task<BillingCancellation?> FindAsync(string? asaasSubscriptionId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(asaasSubscriptionId))
            return Task.FromResult<BillingCancellation?>(null);
        return db.BillingCancellations.SingleOrDefaultAsync(
            item => item.AsaasSubscriptionId == asaasSubscriptionId,
            cancellationToken);
    }

    public async Task ProcessDueAsync(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var dueIds = await db.BillingCancellations.AsNoTracking()
            .Where(item => (item.Status == BillingCancellationStatus.Pending
                    || item.Status == BillingCancellationStatus.ActionRequired)
                && (item.NextAttemptAt == null || item.NextAttemptAt <= now))
            .OrderBy(item => item.NextAttemptAt)
            .Select(item => item.Id)
            .Take(50)
            .ToListAsync(cancellationToken);
        foreach (var id in dueIds)
            await AttemptAsync(id, manualRetry: false, cancellationToken);

        await db.BillingCancellations
            .Where(item => item.Status == BillingCancellationStatus.Confirmed
                && item.RetainUntil != null
                && item.RetainUntil <= now)
            .ExecuteDeleteAsync(cancellationToken);
    }

    private async Task<BillingCancellation> EnsureAsync(
        Guid userId,
        Guid? subscriptionId,
        string asaasSubscriptionId,
        string reason,
        CancellationToken cancellationToken)
    {
        var existing = await db.BillingCancellations
            .SingleOrDefaultAsync(item => item.AsaasSubscriptionId == asaasSubscriptionId, cancellationToken);
        if (existing is not null)
        {
            if (reason is BillingCancellationReason.AccountDeletion or BillingCancellationReason.AdminAccountDeletion)
            {
                existing.Reason = reason;
                existing.UpdatedAt = DateTimeOffset.UtcNow;
                existing.ConcurrencyToken = Guid.NewGuid();
                await db.SaveChangesAsync(cancellationToken);
            }
            return existing;
        }

        var created = new BillingCancellation
        {
            UserId = userId,
            BillingSubscriptionId = subscriptionId,
            AsaasSubscriptionId = asaasSubscriptionId,
            Reason = reason,
            Status = BillingCancellationStatus.Pending,
            NextAttemptAt = DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.BillingCancellations.Add(created);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return created;
        }
        catch (DbUpdateException)
        {
            db.Entry(created).State = EntityState.Detached;
            return await db.BillingCancellations
                .SingleAsync(item => item.AsaasSubscriptionId == asaasSubscriptionId, cancellationToken);
        }
    }

    private async Task MarkLocalSubscriptionCanceledAsync(string asaasSubscriptionId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var subscription = await db.BillingSubscriptions
            .SingleOrDefaultAsync(item => item.AsaasSubscriptionId == asaasSubscriptionId, cancellationToken);
        if (subscription is null)
            return;
        subscription.Status = BillingPricing.Canceled;
        subscription.CancelAtPeriodEnd = true;
        subscription.UpdatedAt = now;
    }

    private static void Confirm(BillingCancellation request, DateTimeOffset now)
    {
        request.Status = BillingCancellationStatus.Confirmed;
        request.ConfirmedAt = now;
        request.ActionRequiredAt = null;
        request.NextAttemptAt = null;
        request.LastFailureCode = null;
        request.RetainUntil = now.AddDays(BillingOptions.CancellationConfirmationRetentionDays);
        request.UpdatedAt = now;
    }

    private static void RequireAction(BillingCancellation request, DateTimeOffset now, string code)
    {
        request.Status = BillingCancellationStatus.ActionRequired;
        request.LastFailureCode = code;
        request.ActionRequiredAt = now;
        request.NextAttemptAt = now.AddHours(BillingOptions.CancellationActionRetryHours);
    }
}
