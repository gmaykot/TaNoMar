using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TaNoMar.Api.Data;
using TaNoMar.Api.Notifications;
using TaNoMar.Api.Options;

namespace TaNoMar.Api.Billing;

internal sealed class BillingService(
    TaNoMarDbContext db,
    AsaasClient asaas,
    NotificationRealtimeHub hub,
    WebPushQueue push,
    IAdminNotificationService adminNotifications,
    IOptions<BillingOptions> billingOptions,
    IOptions<TaNoMarOptions> appOptions,
    ILogger<BillingService> logger)
{
    public bool Enabled => billingOptions.Value.Enabled;

    public async Task<object> CatalogAsync(User user, CancellationToken cancellationToken)
    {
        await ApplyDueAccessAsync(user, cancellationToken);
        var current = await CurrentPaidAsync(user.Id, cancellationToken);
        var plans = await db.Plans.AsNoTracking()
            .Where(plan => plan.Code != PlanRules.Free && plan.IsEnabled)
            .OrderBy(plan => plan.SortOrder)
            .ThenBy(plan => plan.Name)
            .ToListAsync(cancellationToken);
        return new
        {
            enabled = Enabled,
            discountPercent = BillingOptions.AnnualDiscountPercent,
            plans = plans.Select(plan => CatalogPlan(plan, current)).ToList()
        };
    }

    public async Task<object> SubscriptionAsync(User user, CancellationToken cancellationToken)
    {
        await ApplyDueAccessAsync(user, cancellationToken);
        return await DtoAsync(user, cancellationToken);
    }

    public async Task<IResult> CreateCheckoutAsync(User user, string? planCode, string? cycle, string origin, CancellationToken cancellationToken)
    {
        if (!Enabled) return Results.Json(new { code = "billing_disabled", detail = "A cobrança automática ainda não está disponível." }, statusCode: 503);
        var normalizedPlan = PlanRules.NormalizeAssignable(planCode);
        var normalizedCycle = BillingPricing.NormalizeCycle(cycle);
        if (normalizedPlan is null || normalizedPlan == PlanRules.Free || normalizedCycle is null)
            return Results.BadRequest(new { code = "invalid_plan", detail = "Informe um plano pago e o ciclo MONTHLY ou YEARLY." });
        var plan = await db.Plans.AsNoTracking().SingleOrDefaultAsync(item => item.Code == normalizedPlan, cancellationToken);
        if (plan is null || !plan.IsEnabled)
            return Results.Conflict(new { code = "plan_disabled", detail = "Este plano não está disponível." });
        await ApplyDueAccessAsync(user, cancellationToken);
        var currentPlanName = await db.Plans.AsNoTracking()
            .Where(item => item.Code == user.PlanCode)
            .Select(item => item.Name)
            .SingleOrDefaultAsync(cancellationToken) ?? user.PlanCode;
        var current = await CurrentPaidAsync(user.Id, cancellationToken);
        if (current is not null
            && string.Equals(current.PlanCode, normalizedPlan, StringComparison.Ordinal)
            && string.Equals(current.Cycle, normalizedCycle, StringComparison.Ordinal)
            && (current.Status == BillingPricing.Active || HasPaidPeriod(current)))
            return Results.Conflict(new { code = "already_subscribed", detail = "Você já tem este plano neste ciclo." });
        if (current is not null && HasPaidPeriod(current)
            && BillingPricing.IsDowngrade(current.PlanCode, current.Cycle, normalizedPlan, normalizedCycle))
            return Results.Conflict(new { code = "plan_downgrade_period", detail = "O downgrade fica disponível no fim do período já pago." });

        var reusable = await db.BillingSubscriptions.SingleOrDefaultAsync(
            item => item.UserId == user.Id
                && item.PlanCode == normalizedPlan
                && item.Cycle == normalizedCycle
                && item.Status == BillingPricing.PendingCheckout
                && item.ExpiresAt != null
                && item.ExpiresAt > DateTimeOffset.UtcNow
                && item.CheckoutUrl != null,
            cancellationToken);
        if (reusable is not null)
            return Results.Ok(new { checkoutId = reusable.AsaasCheckoutId, checkoutUrl = reusable.CheckoutUrl, expiresAt = reusable.ExpiresAt });

        var catalogCents = BillingPricing.CatalogCents(plan, normalizedCycle);
        var credit = 0;
        string? previousAsaasId = null;
        if (current is not null && HasPaidPeriod(current) && current.PeriodStart is not null && current.CurrentPeriodEnd is not null)
        {
            credit = BillingPricing.CreditCents(current.PriceCents, current.PeriodStart.Value, current.CurrentPeriodEnd.Value, DateTimeOffset.UtcNow);
            previousAsaasId = current.AsaasSubscriptionId;
        }
        var firstCharge = current is not null && HasPaidPeriod(current)
            ? BillingPricing.FirstChargeCents(catalogCents, credit)
            : catalogCents;
        var now = DateTimeOffset.UtcNow;
        var saoPaulo = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTime.UtcNow, saoPaulo));
        var originBase = origin.TrimEnd('/');
        var existingCustomer = await db.BillingCustomers.AsNoTracking()
            .SingleOrDefaultAsync(item => item.UserId == user.Id, cancellationToken);
        AsaasCheckoutCreated created;
        try
        {
            created = await asaas.CreateCheckoutAsync(new AsaasCheckoutRequest
            {
                MinutesToExpire = BillingOptions.CheckoutMinutesToExpire,
                ExternalReference = BillingPricing.ExternalReference(user.Id, normalizedPlan, normalizedCycle),
                Callback = new AsaasCallback
                {
                    SuccessUrl = $"{originBase}/premium?checkout=success",
                    CancelUrl = $"{originBase}/premium?checkout=cancel",
                    ExpiredUrl = $"{originBase}/premium?checkout=expired"
                },
                Items =
                [
                    new AsaasItem
                    {
                        Name = $"TáNoMar {plan.Name}",
                        Description = normalizedCycle == BillingPricing.Yearly
                            ? "Assinatura anual com 20% de desconto"
                            : "Assinatura mensal",
                        Quantity = 1,
                        Value = BillingPricing.Reais(firstCharge)
                    }
                ],
                Customer = string.IsNullOrWhiteSpace(existingCustomer?.AsaasCustomerId)
                    ? null
                    : existingCustomer.AsaasCustomerId,
                Subscription = new AsaasSubscription
                {
                    Cycle = normalizedCycle,
                    NextDueDate = today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
                }
            }, cancellationToken);
        }
        catch (InvalidOperationException)
        {
            return Results.Json(new { code = "checkout_failed", detail = "Não foi possível abrir o pagamento. Tente de novo em instantes." }, statusCode: 502);
        }

        var pending = new BillingSubscription
        {
            UserId = user.Id,
            PlanCode = normalizedPlan,
            Cycle = normalizedCycle,
            Status = BillingPricing.PendingCheckout,
            AsaasCheckoutId = created.Id,
            PreviousAsaasSubscriptionId = previousAsaasId,
            CheckoutUrl = created.Link,
            PriceCents = firstCharge,
            RecurringPriceCents = catalogCents,
            ExternalReference = BillingPricing.ExternalReference(user.Id, normalizedPlan, normalizedCycle),
            ExpiresAt = now.AddMinutes(BillingOptions.CheckoutMinutesToExpire),
            CreatedAt = now,
            UpdatedAt = now
        };
        db.BillingSubscriptions.Add(pending);
        await db.SaveChangesAsync(cancellationToken);
        adminNotifications.NotifyPlanRequested(
            user.Name,
            user.Email,
            currentPlanName,
            plan.Name,
            normalizedCycle,
            firstCharge,
            now);
        return Results.Ok(new { checkoutId = created.Id, checkoutUrl = created.Link, expiresAt = pending.ExpiresAt });
    }

    public async Task StopRecurringForDeletedUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var subscriptions = await db.BillingSubscriptions
            .Where(item => item.UserId == userId)
            .ToListAsync(cancellationToken);
        foreach (var item in subscriptions)
        {
            if (!string.IsNullOrWhiteSpace(item.AsaasSubscriptionId))
                await asaas.DeleteSubscriptionAsync(item.AsaasSubscriptionId, cancellationToken);
            if (!string.IsNullOrWhiteSpace(item.PreviousAsaasSubscriptionId)
                && item.PreviousAsaasSubscriptionId != item.AsaasSubscriptionId)
                await asaas.DeleteSubscriptionAsync(item.PreviousAsaasSubscriptionId, cancellationToken);
        }
    }

    public async Task<IResult> CancelAsync(User user, CancellationToken cancellationToken)
    {
        await ApplyDueAccessAsync(user, cancellationToken);
        var current = await db.BillingSubscriptions
            .Where(item => item.UserId == user.Id && (item.Status == BillingPricing.Active || item.Status == BillingPricing.Canceled))
            .OrderByDescending(item => item.UpdatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (current is null || current.Status == BillingPricing.Canceled || current.CancelAtPeriodEnd)
        {
            if (current is null) return Results.Conflict(new { code = "no_subscription", detail = "Não há renovação para cancelar." });
            return Results.Ok(await DtoAsync(user, cancellationToken));
        }
        if (!string.IsNullOrWhiteSpace(current.AsaasSubscriptionId))
            await asaas.DeleteSubscriptionAsync(current.AsaasSubscriptionId, cancellationToken);
        current.CancelAtPeriodEnd = true;
        current.Status = BillingPricing.Canceled;
        current.UpdatedAt = DateTimeOffset.UtcNow;
        var until = current.CurrentPeriodEnd?.ToString("dd/MM", CultureInfo.GetCultureInfo("pt-BR")) ?? "o fim do período";
        var plan = await db.Plans.AsNoTracking().SingleAsync(item => item.Code == current.PlanCode, cancellationToken);
        const string title = "Renovação cancelada";
        var body = $"A renovação do {plan.Name} foi cancelada. Você continua com o plano até {until}. Não há estorno.";
        db.Notifications.Add(new Notification { UserId = user.Id, Title = title, Body = body });
        await db.SaveChangesAsync(cancellationToken);
        hub.Publish(user.Id, true);
        push.Enqueue(user.Id, title, body);
        return Results.Ok(await DtoAsync(user, cancellationToken));
    }

    public async Task<IResult> HandleWebhookAsync(string? token, JsonElement payload, CancellationToken cancellationToken)
    {
        var expected = billingOptions.Value.AsaasWebhookToken;
        if (string.IsNullOrWhiteSpace(expected))
            return Results.Json(new { detail = "Webhook não configurado." }, statusCode: 503);
        if (!FixedEquals(token, expected))
            return Results.Unauthorized();
        if (payload.ValueKind != JsonValueKind.Object)
            return Results.BadRequest();
        var eventId = ReadString(payload, "id");
        var eventName = ReadString(payload, "event");
        if (string.IsNullOrWhiteSpace(eventId) || string.IsNullOrWhiteSpace(eventName))
            return Results.BadRequest();
        if (await db.BillingWebhookEvents.AnyAsync(item => item.AsaasEventId == eventId, cancellationToken))
            return Results.Ok();
        db.BillingWebhookEvents.Add(new BillingWebhookEvent
        {
            AsaasEventId = eventId,
            Event = eventName,
            ProcessedAt = DateTimeOffset.UtcNow
        });
        try
        {
            await ApplyEventAsync(eventName, payload, cancellationToken);
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Falha ao processar webhook Asaas {Event}.", eventName);
            throw;
        }
        return Results.Ok();
    }

    public async Task ApplyDueAccessAsync(User user, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var items = await db.BillingSubscriptions.Where(item => item.UserId == user.Id).ToListAsync(cancellationToken);
        var changed = false;
        var saoPaulo = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
        var remindedPastDueToday = items.Exists(item => item.Status == BillingPricing.PastDue)
            && await db.Notifications.AnyAsync(
                entry => entry.UserId == user.Id
                    && entry.Title == BillingPricing.PastDueTitle
                    && entry.CreatedAt >= BillingPricing.StartOfLocalDay(now, saoPaulo),
                cancellationToken);
        foreach (var item in items)
        {
            if (item.Status == BillingPricing.PendingCheckout
                && !string.IsNullOrWhiteSpace(item.AsaasCheckoutId)
                && Enabled)
            {
                try
                {
                    var confirmed = await asaas.FindConfirmedCheckoutAsync(item.AsaasCheckoutId, cancellationToken);
                    if (confirmed is not null)
                    {
                        if (!string.IsNullOrWhiteSpace(confirmed.CustomerId))
                            await UpsertCustomerAsync(user.Id, confirmed.CustomerId, cancellationToken);
                        await ActivateAsync(user, item, confirmed.SubscriptionId, cancellationToken);
                        changed = true;
                        continue;
                    }
                }
                catch (Exception exception)
                {
                    logger.LogWarning(exception, "Falha ao reconciliar checkout {CheckoutId}.", item.AsaasCheckoutId);
                }
            }
            if (item.Status == BillingPricing.PendingCheckout && item.ExpiresAt is not null && item.ExpiresAt <= now)
            {
                item.Status = BillingPricing.Expired;
                item.UpdatedAt = now;
                changed = true;
            }
            if ((item.Status == BillingPricing.Canceled || item.CancelAtPeriodEnd)
                && item.CurrentPeriodEnd is not null
                && item.CurrentPeriodEnd <= now
                && PlanRules.IsPaid(user.PlanCode)
                && !IsBootstrap(user))
            {
                user.PlanCode = PlanRules.Free;
                item.UpdatedAt = now;
                changed = true;
                Notify(user.Id, "Plano atualizado", "Seu plano agora é Free.");
            }
            if (item.Status == BillingPricing.PastDue
                && item.PastDueSince is not null
                && item.PastDueSince.Value.AddDays(BillingOptions.PastDueGraceDays) <= now
                && PlanRules.IsPaid(user.PlanCode)
                && !IsBootstrap(user))
            {
                user.PlanCode = PlanRules.Free;
                item.Status = BillingPricing.Canceled;
                item.UpdatedAt = now;
                changed = true;
                Notify(user.Id, "Plano atualizado", "Seu plano agora é Free.");
            }
            else if (item.Status == BillingPricing.PastDue
                && item.PastDueSince is not null
                && !remindedPastDueToday
                && PlanRules.IsPaid(user.PlanCode)
                && !IsBootstrap(user))
            {
                var remaining = BillingPricing.PastDueDaysRemaining(item.PastDueSince.Value, now);
                Notify(user.Id, BillingPricing.PastDueTitle, BillingPricing.PastDueReminderBody(remaining));
                remindedPastDueToday = true;
                changed = true;
            }
        }
        if (changed) await db.SaveChangesAsync(cancellationToken);
    }

    public async Task SyncCatalogPricesAsync(string? planCode, CancellationToken cancellationToken)
    {
        if (!Enabled) return;
        var query = db.BillingSubscriptions.Where(item => item.Status == BillingPricing.Active && !item.CancelAtPeriodEnd);
        if (!string.IsNullOrWhiteSpace(planCode))
            query = query.Where(item => item.PlanCode == planCode);
        var subscriptions = await query.ToListAsync(cancellationToken);
        if (subscriptions.Count == 0) return;
        var plans = await db.Plans.AsNoTracking().ToDictionaryAsync(item => item.Code, cancellationToken);
        foreach (var item in subscriptions)
        {
            if (!plans.TryGetValue(item.PlanCode, out var plan)) continue;
            var next = BillingPricing.CatalogCents(plan, item.Cycle);
            if (item.RecurringPriceCents == next) continue;
            item.RecurringPriceCents = next;
            item.UpdatedAt = DateTimeOffset.UtcNow;
            if (!string.IsNullOrWhiteSpace(item.AsaasSubscriptionId))
                await asaas.UpdateSubscriptionValueAsync(item.AsaasSubscriptionId, BillingPricing.Reais(next), updatePendingPayments: true, cancellationToken);
        }
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<object> DtoAsync(User user, CancellationToken cancellationToken)
    {
        var current = await CurrentAccessAsync(user.Id, cancellationToken);
        var plans = await db.Plans.AsNoTracking().ToDictionaryAsync(item => item.Code, cancellationToken);
        plans.TryGetValue(current?.PlanCode ?? user.PlanCode, out var plan);
        var catalogMonthly = plan?.MonthlyPriceCents ?? 0;
        var catalogAnnual = plan is null ? 0 : BillingPricing.AnnualCents(plan.MonthlyPriceCents);
        var renewal = current is null
            ? 0
            : current.Cycle == BillingPricing.Monthly ? catalogMonthly : catalogAnnual;
        return new
        {
            status = PublicStatus(current),
            planCode = current?.PlanCode,
            cycle = current?.Cycle,
            catalogMonthlyPrice = BillingPricing.Reais(catalogMonthly),
            catalogAnnualPrice = BillingPricing.Reais(catalogAnnual),
            contractedPrice = current is null ? (decimal?)null : BillingPricing.Reais(current.PriceCents),
            renewalPrice = current is null ? (decimal?)null : BillingPricing.Reais(renewal),
            discountPercent = BillingOptions.AnnualDiscountPercent,
            renewsAt = current is { CancelAtPeriodEnd: false } ? current.CurrentPeriodEnd : null,
            accessUntil = current?.CurrentPeriodEnd,
            cancelAtPeriodEnd = current?.CancelAtPeriodEnd ?? false,
            enabled = Enabled
        };
    }

    public string PublicOrigin(string fallback)
    {
        var configured = billingOptions.Value.PublicAppOrigin;
        return string.IsNullOrWhiteSpace(configured) ? fallback.TrimEnd('/') : configured.Trim().TrimEnd('/');
    }

    private object CatalogPlan(Plan plan, BillingSubscription? current)
    {
        var quotes = new List<object>();
        if (current is not null && HasPaidPeriod(current) && current.PeriodStart is not null && current.CurrentPeriodEnd is not null)
        {
            var credit = BillingPricing.CreditCents(current.PriceCents, current.PeriodStart.Value, current.CurrentPeriodEnd.Value, DateTimeOffset.UtcNow);
            var remainingDays = Math.Max(0, (int)Math.Ceiling((current.CurrentPeriodEnd.Value - DateTimeOffset.UtcNow).TotalDays));
            foreach (var cycle in new[] { BillingPricing.Monthly, BillingPricing.Yearly })
            {
                if (!BillingPricing.IsUpgrade(current.PlanCode, current.Cycle, plan.Code, cycle)) continue;
                var catalog = BillingPricing.CatalogCents(plan, cycle);
                quotes.Add(new
                {
                    kind = "upgrade",
                    cycle,
                    remainingDays,
                    creditCents = credit,
                    firstChargeCents = BillingPricing.FirstChargeCents(catalog, credit),
                    renewalPriceCents = catalog
                });
            }
        }
        return new
        {
            code = plan.Code,
            name = plan.Name,
            tagline = plan.Tagline,
            monthlyPriceCents = plan.MonthlyPriceCents,
            annualPriceCents = BillingPricing.AnnualCents(plan.MonthlyPriceCents),
            featured = plan.Featured,
            enabled = plan.IsEnabled,
            sortOrder = plan.SortOrder,
            entitlements = new
            {
                maxForecastDays = plan.MaxForecastDays,
                bestHoursMode = plan.BestHoursMode,
                maxFavorites = plan.MaxFavorites,
                maxPersonalSpots = plan.MaxPersonalSpots,
                maxAlerts = plan.MaxAlerts
            },
            modules = PlanRules.ModulesDto(plan),
            quotes
        };
    }

    private async Task ApplyEventAsync(string eventName, JsonElement payload, CancellationToken cancellationToken)
    {
        var checkoutId = NestedId(payload, "checkout") ?? NestedString(payload, "payment", "checkoutSession");
        var subscriptionId = NestedId(payload, "subscription") ?? NestedString(payload, "payment", "subscription");
        var customerId = NestedId(payload, "customer") ?? NestedString(payload, "payment", "customer") ?? NestedString(payload, "subscription", "customer");
        var externalReference = NestedString(payload, "checkout", "externalReference")
            ?? NestedString(payload, "payment", "externalReference")
            ?? ReadString(payload, "externalReference");
        var item = await FindSubscriptionAsync(checkoutId, subscriptionId, externalReference, cancellationToken);
        if (item is null)
        {
            logger.LogWarning(
                "Webhook Asaas {Event} sem assinatura local (checkout {CheckoutId}, subscription {SubscriptionId}).",
                eventName,
                checkoutId,
                subscriptionId);
            return;
        }
        var user = await db.Users.SingleOrDefaultAsync(entry => entry.Id == item.UserId, cancellationToken);
        if (user is null) return;
        if (!string.IsNullOrWhiteSpace(customerId))
            await UpsertCustomerAsync(user.Id, customerId, cancellationToken);

        switch (eventName)
        {
            case "CHECKOUT_CANCELED":
            case "CHECKOUT_EXPIRED":
                if (item.Status == BillingPricing.PendingCheckout)
                {
                    item.Status = BillingPricing.Expired;
                    item.UpdatedAt = DateTimeOffset.UtcNow;
                }
                break;
            case "SUBSCRIPTION_CREATED":
                if (!string.IsNullOrWhiteSpace(subscriptionId))
                    item.AsaasSubscriptionId = subscriptionId;
                if (item.PriceCents != item.RecurringPriceCents && !string.IsNullOrWhiteSpace(item.AsaasSubscriptionId))
                    await asaas.UpdateSubscriptionValueAsync(item.AsaasSubscriptionId, BillingPricing.Reais(item.RecurringPriceCents), false, cancellationToken);
                if (!string.IsNullOrWhiteSpace(item.PreviousAsaasSubscriptionId)
                    && item.PreviousAsaasSubscriptionId != item.AsaasSubscriptionId)
                    await asaas.DeleteSubscriptionAsync(item.PreviousAsaasSubscriptionId, cancellationToken);
                item.UpdatedAt = DateTimeOffset.UtcNow;
                break;
            case "CHECKOUT_PAID":
            case "PAYMENT_CONFIRMED":
            case "PAYMENT_RECEIVED":
                await ActivateAsync(user, item, subscriptionId, cancellationToken);
                break;
            case "PAYMENT_OVERDUE":
                if (item.Status == BillingPricing.Active && !item.CancelAtPeriodEnd)
                {
                    item.Status = BillingPricing.PastDue;
                    item.PastDueSince = DateTimeOffset.UtcNow;
                    item.UpdatedAt = DateTimeOffset.UtcNow;
                    Notify(
                        user.Id,
                        BillingPricing.PastDueTitle,
                        BillingPricing.PastDueReminderBody(BillingOptions.PastDueGraceDays));
                }
                break;
            case "PAYMENT_REFUNDED":
            case "PAYMENT_CHARGEBACK_REQUESTED":
                if (!IsBootstrap(user) && PlanRules.IsPaid(user.PlanCode))
                {
                    user.PlanCode = PlanRules.Free;
                    item.Status = BillingPricing.Canceled;
                    item.CurrentPeriodEnd = DateTimeOffset.UtcNow;
                    item.UpdatedAt = DateTimeOffset.UtcNow;
                    Notify(user.Id, "Plano atualizado", "Seu plano agora é Free.");
                }
                break;
            case "SUBSCRIPTION_DELETED":
            case "SUBSCRIPTION_INACTIVATED":
                if (item.CancelAtPeriodEnd) break;
                if (item.Status == BillingPricing.Active)
                {
                    item.Status = BillingPricing.Canceled;
                    item.CancelAtPeriodEnd = true;
                    item.UpdatedAt = DateTimeOffset.UtcNow;
                }
                break;
        }
    }

    private async Task ActivateAsync(User user, BillingSubscription item, string? subscriptionId, CancellationToken cancellationToken)
    {
        var firstPayment = item.Status != BillingPricing.Active;
        var previousPlanCode = user.PlanCode;
        if (!string.IsNullOrWhiteSpace(subscriptionId))
            item.AsaasSubscriptionId = subscriptionId;
        var now = DateTimeOffset.UtcNow;
        item.Status = BillingPricing.Active;
        item.CancelAtPeriodEnd = false;
        item.PastDueSince = null;
        item.PeriodStart = now;
        item.CurrentPeriodEnd = BillingPricing.PeriodEnd(item.Cycle, now);
        item.UpdatedAt = now;
        var previous = await db.BillingSubscriptions
            .Where(entry => entry.UserId == user.Id && entry.Id != item.Id && (entry.Status == BillingPricing.Active || entry.Status == BillingPricing.Canceled || entry.Status == BillingPricing.PastDue))
            .ToListAsync(cancellationToken);
        foreach (var old in previous)
        {
            if (!string.IsNullOrWhiteSpace(old.AsaasSubscriptionId) && old.AsaasSubscriptionId != item.AsaasSubscriptionId)
                await asaas.DeleteSubscriptionAsync(old.AsaasSubscriptionId, cancellationToken);
            old.Status = BillingPricing.Expired;
            old.UpdatedAt = now;
        }
        var plan = await db.Plans.AsNoTracking().SingleAsync(entry => entry.Code == item.PlanCode, cancellationToken);
        if (!string.Equals(user.PlanCode, item.PlanCode, StringComparison.Ordinal))
        {
            user.PlanCode = item.PlanCode;
            Notify(user.Id, "Plano atualizado", $"Seu plano agora é {plan.Name}.");
        }
        if (firstPayment)
        {
            var previousPlanName = await db.Plans.AsNoTracking()
                .Where(entry => entry.Code == previousPlanCode)
                .Select(entry => entry.Name)
                .SingleOrDefaultAsync(cancellationToken) ?? previousPlanCode;
            adminNotifications.NotifyPlanPaid(
                user.Name,
                user.Email,
                previousPlanName,
                plan.Name,
                item.Cycle,
                item.PriceCents,
                now);
        }
    }

    private async Task UpsertCustomerAsync(Guid userId, string asaasCustomerId, CancellationToken cancellationToken)
    {
        var row = await db.BillingCustomers.SingleOrDefaultAsync(item => item.UserId == userId, cancellationToken);
        if (row is null)
            db.BillingCustomers.Add(new BillingCustomer { UserId = userId, AsaasCustomerId = asaasCustomerId });
        else if (!string.Equals(row.AsaasCustomerId, asaasCustomerId, StringComparison.Ordinal))
            row.AsaasCustomerId = asaasCustomerId;
    }

    private async Task<BillingSubscription?> FindSubscriptionAsync(
        string? checkoutId,
        string? subscriptionId,
        string? externalReference,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(checkoutId))
        {
            var byCheckout = await db.BillingSubscriptions.SingleOrDefaultAsync(item => item.AsaasCheckoutId == checkoutId, cancellationToken);
            if (byCheckout is not null) return byCheckout;
        }
        if (!string.IsNullOrWhiteSpace(subscriptionId))
        {
            var bySubscription = await db.BillingSubscriptions.SingleOrDefaultAsync(item => item.AsaasSubscriptionId == subscriptionId, cancellationToken);
            if (bySubscription is not null) return bySubscription;
        }
        if (!string.IsNullOrWhiteSpace(externalReference))
            return await db.BillingSubscriptions
                .Where(item => item.ExternalReference == externalReference)
                .OrderByDescending(item => item.UpdatedAt)
                .FirstOrDefaultAsync(cancellationToken);
        return null;
    }

    private async Task<BillingSubscription?> CurrentPaidAsync(Guid userId, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        return await db.BillingSubscriptions
            .Where(item => item.UserId == userId && (
                item.Status == BillingPricing.Active
                || item.Status == BillingPricing.PastDue
                || (item.Status == BillingPricing.Canceled && item.CurrentPeriodEnd != null && item.CurrentPeriodEnd > now)))
            .OrderByDescending(item => item.Status == BillingPricing.Active ? 2 : 1)
            .ThenByDescending(item => item.UpdatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<BillingSubscription?> CurrentAccessAsync(Guid userId, CancellationToken cancellationToken)
    {
        var paid = await CurrentPaidAsync(userId, cancellationToken);
        if (paid is not null) return paid;
        var now = DateTimeOffset.UtcNow;
        return await db.BillingSubscriptions
            .Where(item => item.UserId == userId
                && item.Status == BillingPricing.PendingCheckout
                && (item.ExpiresAt == null || item.ExpiresAt > now))
            .OrderByDescending(item => item.UpdatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static string PublicStatus(BillingSubscription? current)
    {
        if (current is null) return "inactive";
        return current.Status == BillingPricing.PendingCheckout ? "pending" : current.Status;
    }

    private static bool HasPaidPeriod(BillingSubscription item) =>
        item.CurrentPeriodEnd is not null
        && item.CurrentPeriodEnd > DateTimeOffset.UtcNow
        && item.Status is BillingPricing.Active or BillingPricing.PastDue or BillingPricing.Canceled;

    private bool IsBootstrap(User user) =>
        (!string.IsNullOrWhiteSpace(appOptions.Value.BootstrapAdminGoogleSubject) && user.GoogleSubject == appOptions.Value.BootstrapAdminGoogleSubject)
        || (!string.IsNullOrWhiteSpace(appOptions.Value.BootstrapAdminEmail)
            && string.Equals(user.Email, appOptions.Value.BootstrapAdminEmail, StringComparison.OrdinalIgnoreCase));

    private void Notify(Guid userId, string title, string body)
    {
        db.Notifications.Add(new Notification { UserId = userId, Title = title, Body = body });
        hub.Publish(userId, true);
        push.Enqueue(userId, title, body);
    }

    private static bool FixedEquals(string? left, string right)
    {
        if (string.IsNullOrEmpty(left)) return false;
        var a = Encoding.UTF8.GetBytes(left);
        var b = Encoding.UTF8.GetBytes(right);
        return a.Length == b.Length && CryptographicOperations.FixedTimeEquals(a, b);
    }

    private static string? ReadString(JsonElement payload, string name) =>
        payload.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;

    private static string? NestedId(JsonElement payload, string name)
    {
        if (!payload.TryGetProperty(name, out var value)) return null;
        if (value.ValueKind == JsonValueKind.String) return value.GetString();
        if (value.ValueKind == JsonValueKind.Object && value.TryGetProperty("id", out var id) && id.ValueKind == JsonValueKind.String)
            return id.GetString();
        return null;
    }

    private static string? NestedString(JsonElement payload, string parent, string child)
    {
        if (!payload.TryGetProperty(parent, out var value) || value.ValueKind != JsonValueKind.Object) return null;
        return ReadString(value, child);
    }
}
