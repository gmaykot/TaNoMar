using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;
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
    public const string UpgradeReplacement = "upgrade_replacement";
    public const string LegacyReconciliation = "legacy_reconciliation";
}

internal static class AccountDeletionStatus
{
    public const string Prepared = "prepared";
    public const string Completed = "completed";
    public const string Pending = "cancellation_pending";
    public const string ActionRequired = "action_required";
}

internal sealed record AccountDeletionPreparation(
    Guid ReceiptId,
    string Protocol,
    int RemoteSubscriptionCount);

internal sealed record AccountDeletionPublicStatus(string Status, DateTimeOffset UpdatedAt);

internal sealed record BillingCancellationOperation(
    Guid Id,
    string AsaasSubscriptionId,
    string Status,
    TimeSpan Age,
    int AttemptCount,
    string? LastFailureCode,
    DateTimeOffset? LastAttemptAt,
    DateTimeOffset? NextAttemptAt);

internal sealed class BillingCancellationService(
    TaNoMarDbContext db,
    IAsaasClient asaas,
    ILogger<BillingCancellationService> logger)
{
    private readonly Guid leaseOwner = Guid.NewGuid();

    public async Task<BillingCancellation> RequestAsync(
        Guid userId,
        BillingSubscription? subscription,
        string asaasSubscriptionId,
        string reason,
        bool manualRetry,
        CancellationToken cancellationToken)
    {
        var request = await EnsureAsync(userId, subscription?.Id, asaasSubscriptionId, reason, null, cancellationToken);
        return await AttemptAsync(request.Id, manualRetry, cancellationToken);
    }

    public async Task<AccountDeletionPreparation> PrepareAccountDeletionAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var protocol = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        var receipt = new AccountDeletionReceipt
        {
            UserId = userId,
            ProtocolHash = HashProtocol(protocol),
            Status = AccountDeletionStatus.Prepared,
            RetainUntil = now.AddHours(BillingOptions.AccountDeletionPreparationHours),
            CreatedAt = now,
            UpdatedAt = now
        };
        db.AccountDeletionReceipts.Add(receipt);
        await db.SaveChangesAsync(cancellationToken);
        return new AccountDeletionPreparation(receipt.Id, protocol, 0);
    }

    public async Task<AccountDeletionPreparation?> ResolvePreparationAsync(
        Guid userId,
        string protocol,
        CancellationToken cancellationToken)
    {
        if (!IsValidProtocol(protocol)) return null;
        var hash = HashProtocol(protocol);
        var now = DateTimeOffset.UtcNow;
        var receipt = await db.AccountDeletionReceipts.SingleOrDefaultAsync(
            item => item.ProtocolHash == hash
                && item.UserId == userId
                && item.AccountDeletedAt == null
                && (item.RetainUntil == null || item.RetainUntil > now),
            cancellationToken);
        return receipt is null
            ? null
            : new AccountDeletionPreparation(receipt.Id, protocol, receipt.RemoteSubscriptionCount);
    }

    public async Task<List<BillingCancellation>> EnsureAccountDeletionRequestsAsync(
        Guid userId,
        IReadOnlyCollection<BillingSubscription> subscriptions,
        string reason,
        Guid? receiptId,
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
                requests.Add(await EnsureAsync(userId, subscription.Id, remoteId, reason, receiptId, cancellationToken));
        }
        return requests.DistinctBy(item => item.AsaasSubscriptionId, StringComparer.Ordinal).ToList();
    }

    public async Task<BillingCancellation> AttemptAsync(Guid requestId, bool manualRetry, CancellationToken cancellationToken)
    {
        var snapshot = await db.BillingCancellations.AsNoTracking()
            .SingleAsync(item => item.Id == requestId, cancellationToken);
        if (snapshot.Status == BillingCancellationStatus.Confirmed)
            return snapshot;

        if (!await TryClaimAsync(requestId, cancellationToken))
            return await db.BillingCancellations.AsNoTracking().SingleAsync(item => item.Id == requestId, cancellationToken);

        try
        {
            var request = await db.BillingCancellations.SingleAsync(item => item.Id == requestId, cancellationToken);
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
            if (request.LeaseOwner != leaseOwner)
                return request;

            var now = DateTimeOffset.UtcNow;
            request.AttemptCount += 1;
            request.LastAttemptAt = now;
            request.UpdatedAt = now;
            request.ConcurrencyToken = Guid.NewGuid();
            request.LeaseOwner = null;
            request.LeaseExpiresAt = null;
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
                return request;
            }
            await UpdateReceiptAsync(request.AccountDeletionReceiptId, cancellationToken);
            return request;
        }
        finally
        {
            await ReleaseLeaseAsync(requestId, cancellationToken);
        }
    }

    public async Task ConfirmFromWebhookAsync(string asaasSubscriptionId, CancellationToken cancellationToken)
    {
        var request = await db.BillingCancellations
            .Where(item => item.AsaasSubscriptionId == asaasSubscriptionId)
            .OrderByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (request is null || request.Status == BillingCancellationStatus.Confirmed)
            return;
        var now = DateTimeOffset.UtcNow;
        Confirm(request, now);
        request.LeaseOwner = null;
        request.LeaseExpiresAt = null;
        request.ConcurrencyToken = Guid.NewGuid();
        await MarkLocalSubscriptionCanceledAsync(asaasSubscriptionId, now, cancellationToken);
        await UpdateReceiptAsync(request.AccountDeletionReceiptId, cancellationToken, saveChanges: false);
    }

    public Task<BillingCancellation?> FindAsync(string? asaasSubscriptionId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(asaasSubscriptionId))
            return Task.FromResult<BillingCancellation?>(null);
        return db.BillingCancellations
            .Where(item => item.AsaasSubscriptionId == asaasSubscriptionId)
            .OrderByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<BillingCancellationOperation>> ListOperationsAsync(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var rows = await db.BillingCancellations.AsNoTracking()
            .Where(item => item.Status == BillingCancellationStatus.Pending
                || item.Status == BillingCancellationStatus.ActionRequired)
            .OrderByDescending(item => item.Status == BillingCancellationStatus.ActionRequired)
            .ThenBy(item => item.CreatedAt)
            .Take(200)
            .ToListAsync(cancellationToken);
        return rows.Select(item => new BillingCancellationOperation(
            item.Id,
            item.AsaasSubscriptionId,
            item.Status,
            now - item.CreatedAt,
            item.AttemptCount,
            SanitizeFailureCode(item.LastFailureCode),
            item.LastAttemptAt,
            item.NextAttemptAt)).ToList();
    }

    public async Task<AccountDeletionPublicStatus?> GetPublicStatusAsync(string protocol, CancellationToken cancellationToken)
    {
        if (!IsValidProtocol(protocol)) return null;
        var hash = HashProtocol(protocol);
        return await db.AccountDeletionReceipts.AsNoTracking()
            .Where(item => item.ProtocolHash == hash
                && (item.RetainUntil == null || item.RetainUntil > DateTimeOffset.UtcNow))
            .Select(item => new AccountDeletionPublicStatus(item.Status, item.UpdatedAt))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task MarkAccountDeletedAsync(Guid receiptId, CancellationToken cancellationToken)
    {
        var receipt = await db.AccountDeletionReceipts.SingleAsync(item => item.Id == receiptId, cancellationToken);
        receipt.AccountDeletedAt = DateTimeOffset.UtcNow;
        receipt.UserId = null;
        await UpdateReceiptAsync(receiptId, cancellationToken);
    }

    public async Task ProcessDueAsync(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var dueIds = await db.BillingCancellations.AsNoTracking()
            .Where(item => (item.Status == BillingCancellationStatus.Pending
                    || item.Status == BillingCancellationStatus.ActionRequired)
                && (item.NextAttemptAt == null || item.NextAttemptAt <= now)
                && (item.LeaseExpiresAt == null || item.LeaseExpiresAt <= now))
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
        await db.AccountDeletionReceipts
            .Where(item => item.RetainUntil != null && item.RetainUntil <= now)
            .ExecuteDeleteAsync(cancellationToken);
    }

    private async Task<bool> TryClaimAsync(Guid requestId, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var expiresAt = now.AddMinutes(BillingOptions.CancellationLeaseMinutes);
        if (db.Database.IsRelational())
        {
            var affected = await db.BillingCancellations
                .Where(item => item.Id == requestId
                    && item.Status != BillingCancellationStatus.Confirmed
                    && (item.LeaseExpiresAt == null || item.LeaseExpiresAt <= now || item.LeaseOwner == leaseOwner))
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(item => item.LeaseOwner, leaseOwner)
                    .SetProperty(item => item.LeaseExpiresAt, expiresAt), cancellationToken);
            return affected == 1;
        }

        var request = await db.BillingCancellations.SingleAsync(item => item.Id == requestId, cancellationToken);
        if (request.Status == BillingCancellationStatus.Confirmed
            || (request.LeaseExpiresAt > now && request.LeaseOwner != leaseOwner))
            return false;
        request.LeaseOwner = leaseOwner;
        request.LeaseExpiresAt = expiresAt;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task ReleaseLeaseAsync(Guid requestId, CancellationToken cancellationToken)
    {
        try
        {
            if (db.Database.IsRelational())
            {
                await db.BillingCancellations
                    .Where(item => item.Id == requestId && item.LeaseOwner == leaseOwner)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(item => item.LeaseOwner, (Guid?)null)
                        .SetProperty(item => item.LeaseExpiresAt, (DateTimeOffset?)null), cancellationToken);
                return;
            }
            var request = await db.BillingCancellations.SingleOrDefaultAsync(
                item => item.Id == requestId && item.LeaseOwner == leaseOwner, cancellationToken);
            if (request is null) return;
            request.LeaseOwner = null;
            request.LeaseExpiresAt = null;
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // O lease expira e outro worker retoma após reinício/interrupção.
        }
    }

    private async Task<BillingCancellation> EnsureAsync(
        Guid userId,
        Guid? subscriptionId,
        string asaasSubscriptionId,
        string reason,
        Guid? receiptId,
        CancellationToken cancellationToken)
    {
        var existing = await db.BillingCancellations
            .Where(item => item.AsaasSubscriptionId == asaasSubscriptionId)
            .OrderByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (existing is not null)
        {
            if (reason is BillingCancellationReason.AccountDeletion or BillingCancellationReason.AdminAccountDeletion)
            {
                existing.Reason = reason;
                existing.AccountDeletionReceiptId = receiptId;
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
            AccountDeletionReceiptId = receiptId,
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
                .Where(item => item.AsaasSubscriptionId == asaasSubscriptionId)
                .OrderByDescending(item => item.CreatedAt)
                .FirstAsync(cancellationToken);
        }
    }

    private async Task UpdateReceiptAsync(
        Guid? receiptId,
        CancellationToken cancellationToken,
        bool saveChanges = true)
    {
        if (receiptId is null) return;
        var receipt = await db.AccountDeletionReceipts.SingleOrDefaultAsync(item => item.Id == receiptId, cancellationToken);
        if (receipt is null) return;
        var linkedCancellations = await db.BillingCancellations
            .Where(item => item.AccountDeletionReceiptId == receiptId)
            .ToListAsync(cancellationToken);
        var statuses = linkedCancellations.Select(item => item.Status).ToList();
        receipt.RemoteSubscriptionCount = statuses.Count;
        var now = DateTimeOffset.UtcNow;
        receipt.UpdatedAt = now;
        if (receipt.AccountDeletedAt is null)
        {
            receipt.Status = AccountDeletionStatus.Prepared;
            receipt.RetainUntil = now.AddHours(BillingOptions.AccountDeletionPreparationHours);
        }
        else if (statuses.Exists(status => status == BillingCancellationStatus.ActionRequired))
        {
            receipt.Status = AccountDeletionStatus.ActionRequired;
            receipt.RetainUntil = null;
        }
        else if (statuses.Exists(status => status != BillingCancellationStatus.Confirmed))
        {
            receipt.Status = AccountDeletionStatus.Pending;
            receipt.RetainUntil = null;
        }
        else
        {
            receipt.Status = AccountDeletionStatus.Completed;
            receipt.RetainUntil = now.AddDays(BillingOptions.CancellationConfirmationRetentionDays);
        }
        if (saveChanges)
            await db.SaveChangesAsync(cancellationToken);
    }

    private async Task MarkLocalSubscriptionCanceledAsync(string asaasSubscriptionId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var subscriptions = await db.BillingSubscriptions
            .Where(item => item.AsaasSubscriptionId == asaasSubscriptionId)
            .ToListAsync(cancellationToken);
        foreach (var subscription in subscriptions)
        {
            subscription.Status = BillingPricing.Canceled;
            subscription.CancelAtPeriodEnd = true;
            subscription.UpdatedAt = now;
        }
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

    private static bool IsValidProtocol(string? protocol) =>
        !string.IsNullOrWhiteSpace(protocol) && protocol.Length is >= 40 and <= 64;

    private static string HashProtocol(string protocol) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(protocol)));

    private static string? SanitizeFailureCode(string? code) => code switch
    {
        "asaas_rejected" or "retry_limit" or "asaas_unconfirmed" => code,
        null => null,
        _ => "internal_error"
    };
}
