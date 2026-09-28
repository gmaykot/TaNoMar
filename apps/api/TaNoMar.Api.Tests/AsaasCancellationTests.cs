using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using TaNoMar.Api.Billing;
using TaNoMar.Api.Data;
using TaNoMar.Api.Notifications;
using TaNoMar.Api.Options;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class AsaasCancellationTests
{
    [Fact]
    public async Task AmbiguousDeleteIsNotReportedAsConfirmed()
    {
        var client = CreateClient(
            _ => Json(HttpStatusCode.InternalServerError, "{}"),
            _ => Json(HttpStatusCode.OK, "{\"data\":[],\"hasMore\":false}"));

        var outcome = await client.CancelSubscriptionAsync("sub_1", CancellationToken.None);

        Assert.Equal(AsaasCancellationOutcome.Pending, outcome);
    }

    [Fact]
    public async Task LostDeleteResponseIsConfirmedOnlyAfterDeletedSubscriptionReconciliation()
    {
        var client = CreateClient(
            _ => throw new HttpRequestException("connection lost"),
            _ => Json(HttpStatusCode.OK, "{\"data\":[{\"id\":\"sub_1\"}],\"hasMore\":false}"));

        var outcome = await client.CancelSubscriptionAsync("sub_1", CancellationToken.None);

        Assert.Equal(AsaasCancellationOutcome.Confirmed, outcome);
    }

    [Fact]
    public async Task NotFoundWithoutDeletedRecordRequiresAction()
    {
        var client = CreateClient(
            _ => Json(HttpStatusCode.NotFound, "{}"),
            _ => Json(HttpStatusCode.OK, "{\"data\":[],\"hasMore\":false}"));

        var outcome = await client.CancelSubscriptionAsync("sub_unknown", CancellationToken.None);

        Assert.Equal(AsaasCancellationOutcome.ActionRequired, outcome);
    }

    [Fact]
    public async Task DeletedSubscriptionLookupFindsExactIdOnlyOnSecondPage()
    {
        var client = CreateClient(
            request =>
            {
                Assert.Equal(HttpMethod.Delete, request.Method);
                return Json(HttpStatusCode.InternalServerError, "{}");
            },
            request =>
            {
                Assert.Contains("deletedOnly=true", request.RequestUri!.Query);
                Assert.Contains("offset=0", request.RequestUri.Query);
                return Json(HttpStatusCode.OK, "{\"data\":[{\"id\":\"sub_target_old\"}],\"hasMore\":true}");
            },
            request =>
            {
                Assert.Contains("offset=100", request.RequestUri!.Query);
                return Json(HttpStatusCode.OK, "{\"data\":[{\"id\":\"sub_target\"}],\"hasMore\":false}");
            });

        var outcome = await client.CancelSubscriptionAsync("sub_target", CancellationToken.None);

        Assert.Equal(AsaasCancellationOutcome.Confirmed, outcome);
    }

    [Fact]
    public async Task PendingCancellationKeepsRemoteIdAndDoesNotMarkSubscriptionCanceled()
    {
        await using var db = CreateDb();
        var subscription = AddSubscription(db, "sub_pending");
        var service = CreateCancellationService(db, new FakeAsaasClient(AsaasCancellationOutcome.Pending));

        var request = await service.RequestAsync(
            subscription.UserId,
            subscription,
            subscription.AsaasSubscriptionId!,
            BillingCancellationReason.UserRequest,
            manualRetry: true,
            CancellationToken.None);

        Assert.Equal(BillingCancellationStatus.Pending, request.Status);
        Assert.Equal("sub_pending", request.AsaasSubscriptionId);
        Assert.False(subscription.CancelAtPeriodEnd);
        Assert.Equal(BillingPricing.Active, subscription.Status);
    }

    [Fact]
    public async Task ConfirmedCancellationMarksSubscriptionAndRetainsMinimalRecord()
    {
        await using var db = CreateDb();
        var subscription = AddSubscription(db, "sub_confirmed");
        var service = CreateCancellationService(db, new FakeAsaasClient(AsaasCancellationOutcome.Confirmed));

        var request = await service.RequestAsync(
            subscription.UserId,
            subscription,
            subscription.AsaasSubscriptionId!,
            BillingCancellationReason.AccountDeletion,
            manualRetry: true,
            CancellationToken.None);

        db.BillingSubscriptions.Remove(subscription);
        db.Users.RemoveRange(db.Users.Where(item => item.Id == subscription.UserId));
        await db.SaveChangesAsync();

        var retained = await db.BillingCancellations.SingleAsync();
        Assert.Equal(BillingCancellationStatus.Confirmed, request.Status);
        Assert.True(subscription.CancelAtPeriodEnd);
        Assert.Equal("sub_confirmed", retained.AsaasSubscriptionId);
        Assert.NotNull(retained.RetainUntil);
        Assert.True(retained.RetainUntil > retained.ConfirmedAt);
    }

    [Fact]
    public async Task AccountDeletionProtocolIsHashedAndTracksLaterStateChanges()
    {
        await using var db = CreateDb();
        var subscription = AddSubscription(db, "sub_protocol");
        var fake = new FakeAsaasClient(AsaasCancellationOutcome.Pending);
        var service = CreateCancellationService(db, fake);

        var preparation = await service.PrepareAccountDeletionAsync(subscription.UserId, CancellationToken.None);
        Assert.DoesNotContain(preparation.Protocol, (await db.AccountDeletionReceipts.SingleAsync()).ProtocolHash);
        Assert.Equal(AccountDeletionStatus.Prepared, (await service.GetPublicStatusAsync(preparation.Protocol, CancellationToken.None))?.Status);
        Assert.Empty(await db.BillingCancellations.ToListAsync());
        Assert.Equal(0, fake.Calls);

        var receipt = await db.AccountDeletionReceipts.SingleAsync();
        receipt.RetainUntil = DateTimeOffset.UtcNow.AddSeconds(-1);
        await db.SaveChangesAsync();
        Assert.Null(await service.ResolvePreparationAsync(subscription.UserId, preparation.Protocol, CancellationToken.None));
        receipt.RetainUntil = DateTimeOffset.UtcNow.AddHours(1);
        await db.SaveChangesAsync();

        await service.EnsureAccountDeletionRequestsAsync(
            subscription.UserId,
            [subscription],
            BillingCancellationReason.AccountDeletion,
            preparation.ReceiptId,
            CancellationToken.None);
        await service.MarkAccountDeletedAsync(preparation.ReceiptId, CancellationToken.None);
        Assert.Equal(AccountDeletionStatus.Pending, (await service.GetPublicStatusAsync(preparation.Protocol, CancellationToken.None))?.Status);

        fake.Outcome = AsaasCancellationOutcome.ActionRequired;
        var cancellation = await db.BillingCancellations.SingleAsync();
        await service.AttemptAsync(cancellation.Id, manualRetry: true, CancellationToken.None);
        Assert.Equal(AccountDeletionStatus.ActionRequired, (await service.GetPublicStatusAsync(preparation.Protocol, CancellationToken.None))?.Status);

        fake.Outcome = AsaasCancellationOutcome.Confirmed;
        await service.AttemptAsync(cancellation.Id, manualRetry: true, CancellationToken.None);
        var completed = await service.GetPublicStatusAsync(preparation.Protocol, CancellationToken.None);
        Assert.Equal(AccountDeletionStatus.Completed, completed?.Status);
        Assert.NotNull((await db.AccountDeletionReceipts.SingleAsync()).RetainUntil);
    }

    [Theory]
    [InlineData("created", null, false, false)]
    [InlineData("pending", null, true, false)]
    [InlineData("refused", "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED", true, false)]
    [InlineData("expired", "CHECKOUT_EXPIRED", true, false)]
    [InlineData("abandoned", null, true, true)]
    public async Task UpgradeWithoutFinancialConfirmationNeverCancelsPreviousSubscription(
        string state,
        string? terminalEvent,
        bool subscriptionCreated,
        bool expireLocally)
    {
        await using var db = CreateDb();
        var oldSubscription = AddSubscription(db, "sub_upgrade_old");
        var replacement = await AddPendingUpgradeAsync(db, oldSubscription);
        var fake = new FakeAsaasClient(AsaasCancellationOutcome.Pending);
        var service = CreateBillingService(db, fake);

        if (subscriptionCreated)
            await service.HandleWebhookAsync(
                "webhook-test",
                Webhook("evt_created", "SUBSCRIPTION_CREATED", "sub_upgrade_new", "chk_upgrade"),
                CancellationToken.None);
        if (terminalEvent is not null)
            await service.HandleWebhookAsync(
                "webhook-test",
                Webhook($"evt_{terminalEvent}", terminalEvent, "sub_upgrade_new", "chk_upgrade"),
                CancellationToken.None);
        if (expireLocally)
        {
            replacement.ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(-1);
            await db.SaveChangesAsync();
            await service.ApplyDueAccessAsync(await db.Users.SingleAsync(), CancellationToken.None);
        }

        Assert.Equal(0, fake.Calls);
        Assert.Empty(await db.BillingCancellations.AsNoTracking().ToListAsync());
        Assert.Equal(BillingPricing.Active, oldSubscription.Status);
        Assert.False(oldSubscription.CancelAtPeriodEnd);
        Assert.Equal("premium", (await db.Users.SingleAsync()).PlanCode);
        Assert.Equal(
            state is "expired" or "abandoned" ? BillingPricing.Expired : BillingPricing.PendingCheckout,
            replacement.Status);
    }

    [Theory]
    [InlineData("CHECKOUT_PAID")]
    [InlineData("PAYMENT_CONFIRMED")]
    [InlineData("PAYMENT_RECEIVED")]
    public async Task FinancialConfirmationPersistsOldSubscriptionCancellationBeforeRemoteAttempt(string eventName)
    {
        await using var db = CreateDb();
        var oldSubscription = AddSubscription(db, "sub_upgrade_old");
        await AddPendingUpgradeAsync(db, oldSubscription);

        var remoteCalls = 0;
        var fake = new CallbackAsaasClient(async () =>
        {
            remoteCalls++;
            var persisted = await db.BillingCancellations.AsNoTracking().SingleAsync();
            Assert.Equal("sub_upgrade_old", persisted.AsaasSubscriptionId);
            Assert.Equal(BillingCancellationReason.UpgradeReplacement, persisted.Reason);
            Assert.Equal(BillingCancellationStatus.Pending, persisted.Status);
        });
        var service = CreateBillingService(db, fake);

        await service.HandleWebhookAsync(
            "webhook-test",
            Webhook("evt_upgrade", eventName, "sub_upgrade_new", "chk_upgrade"),
            CancellationToken.None);

        Assert.Equal(1, remoteCalls);
        var cancellation = await db.BillingCancellations.AsNoTracking().SingleAsync();
        Assert.Equal("sub_upgrade_old", cancellation.AsaasSubscriptionId);
        Assert.Equal(BillingCancellationStatus.Pending, cancellation.Status);
        Assert.Equal("asaas_unconfirmed", cancellation.LastFailureCode);
    }

    [Fact]
    public async Task PaymentBeforeSubscriptionCreatedCancelsPreviousSubscriptionOnlyOnce()
    {
        await using var db = CreateDb();
        var oldSubscription = AddSubscription(db, "sub_upgrade_old");
        var replacement = await AddPendingUpgradeAsync(db, oldSubscription);
        var fake = new FakeAsaasClient(AsaasCancellationOutcome.Pending);
        var service = CreateBillingService(db, fake);

        await service.HandleWebhookAsync(
            "webhook-test",
            Webhook("evt_paid_first", "PAYMENT_CONFIRMED", "sub_upgrade_new", "chk_upgrade"),
            CancellationToken.None);
        await service.HandleWebhookAsync(
            "webhook-test",
            Webhook("evt_created_late", "SUBSCRIPTION_CREATED", "sub_upgrade_new", "chk_upgrade"),
            CancellationToken.None);

        Assert.Equal(1, fake.Calls);
        Assert.Single(await db.BillingCancellations.AsNoTracking().ToListAsync());
        Assert.Equal(BillingPricing.Expired, oldSubscription.Status);
        Assert.Equal(BillingPricing.Active, replacement.Status);
        Assert.Equal("capitao", (await db.Users.SingleAsync()).PlanCode);
    }

    [Fact]
    public async Task PaymentAfterCheckoutExpiredStillUsesFinancialConfirmationAsCancellationTrigger()
    {
        await using var db = CreateDb();
        var oldSubscription = AddSubscription(db, "sub_upgrade_old");
        var replacement = await AddPendingUpgradeAsync(db, oldSubscription);
        var fake = new FakeAsaasClient(AsaasCancellationOutcome.Pending);
        var service = CreateBillingService(db, fake);

        await service.HandleWebhookAsync(
            "webhook-test",
            Webhook("evt_expired_first", "CHECKOUT_EXPIRED", "sub_upgrade_new", "chk_upgrade"),
            CancellationToken.None);
        Assert.Equal(0, fake.Calls);
        Assert.Equal(BillingPricing.Active, oldSubscription.Status);

        await service.HandleWebhookAsync(
            "webhook-test",
            Webhook("evt_paid_late", "PAYMENT_RECEIVED", "sub_upgrade_new", "chk_upgrade"),
            CancellationToken.None);

        Assert.Equal(1, fake.Calls);
        Assert.Single(await db.BillingCancellations.AsNoTracking().ToListAsync());
        Assert.Equal(BillingPricing.Expired, oldSubscription.Status);
        Assert.Equal(BillingPricing.Active, replacement.Status);
    }

    [Fact]
    public async Task DeletedWebhookConfirmsDuplicateLocalRemoteIdsWithoutThrowing()
    {
        await using var db = CreateDb();
        var first = AddSubscription(db, "sub_duplicate_local");
        db.BillingSubscriptions.Add(new BillingSubscription
        {
            UserId = first.UserId,
            PlanCode = "premium",
            Cycle = BillingPricing.Monthly,
            Status = BillingPricing.Active,
            AsaasSubscriptionId = "sub_duplicate_local",
            ExternalReference = Guid.NewGuid().ToString(),
            UpdatedAt = first.UpdatedAt.AddMinutes(1)
        });
        db.BillingCancellations.Add(new BillingCancellation
        {
            UserId = first.UserId,
            BillingSubscriptionId = first.Id,
            AsaasSubscriptionId = "sub_duplicate_local",
            Reason = BillingCancellationReason.UserRequest,
            Status = BillingCancellationStatus.Pending
        });
        await db.SaveChangesAsync();
        var service = CreateBillingService(db, new FakeAsaasClient(AsaasCancellationOutcome.Pending));

        await service.HandleWebhookAsync(
            "webhook-test",
            Webhook("evt_duplicate_local", "SUBSCRIPTION_DELETED", "sub_duplicate_local"),
            CancellationToken.None);

        var locals = await db.BillingSubscriptions.AsNoTracking()
            .Where(item => item.AsaasSubscriptionId == "sub_duplicate_local")
            .ToListAsync();
        Assert.Equal(2, locals.Count);
        Assert.All(locals, item =>
        {
            Assert.Equal(BillingPricing.Canceled, item.Status);
            Assert.True(item.CancelAtPeriodEnd);
        });
        Assert.Equal(BillingCancellationStatus.Confirmed, (await db.BillingCancellations.SingleAsync()).Status);
    }

    [Fact]
    public async Task OperationsListExposesOnlyPendingWorkAndSanitizedFailures()
    {
        await using var db = CreateDb();
        var subscription = AddSubscription(db, "sub_operations");
        db.BillingCancellations.AddRange(
            new BillingCancellation
            {
                UserId = subscription.UserId,
                AsaasSubscriptionId = "sub_pending_operation",
                Reason = BillingCancellationReason.LegacyReconciliation,
                Status = BillingCancellationStatus.Pending,
                LastFailureCode = "provider_secret_detail"
            },
            new BillingCancellation
            {
                UserId = subscription.UserId,
                AsaasSubscriptionId = "sub_done_operation",
                Reason = BillingCancellationReason.UserRequest,
                Status = BillingCancellationStatus.Confirmed
            });
        await db.SaveChangesAsync();
        var service = CreateCancellationService(db, new FakeAsaasClient(AsaasCancellationOutcome.Pending));

        var rows = await service.ListOperationsAsync(CancellationToken.None);

        var row = Assert.Single(rows);
        Assert.Equal("sub_pending_operation", row.AsaasSubscriptionId);
        Assert.Equal("internal_error", row.LastFailureCode);
    }

    [Fact]
    public async Task RepeatedAmbiguousResponsesBecomeActionRequiredAndRemainRetryable()
    {
        await using var db = CreateDb();
        var subscription = AddSubscription(db, "sub_retry");
        var fake = new FakeAsaasClient(AsaasCancellationOutcome.Pending);
        var service = CreateCancellationService(db, fake);
        var request = await service.RequestAsync(
            subscription.UserId,
            subscription,
            subscription.AsaasSubscriptionId!,
            BillingCancellationReason.UserRequest,
            manualRetry: true,
            CancellationToken.None);
        for (var index = 1; index < BillingOptions.CancellationMaxAutomaticAttempts; index++)
            request = await service.AttemptAsync(request.Id, manualRetry: true, CancellationToken.None);

        Assert.Equal(BillingCancellationStatus.ActionRequired, request.Status);
        Assert.NotNull(request.NextAttemptAt);
        Assert.False(subscription.CancelAtPeriodEnd);

        fake.Outcome = AsaasCancellationOutcome.Confirmed;
        request = await service.AttemptAsync(request.Id, manualRetry: true, CancellationToken.None);
        Assert.Equal(BillingCancellationStatus.Confirmed, request.Status);
        Assert.True(subscription.CancelAtPeriodEnd);
    }

    [Fact]
    public async Task SimultaneousConfirmedRequestsSendSingleRemoteDelete()
    {
        var root = new InMemoryDatabaseRoot();
        var databaseName = Guid.NewGuid().ToString();
        await using var setupDb = CreateDb(databaseName, root);
        var subscription = AddSubscription(setupDb, "sub_parallel");
        var request = new BillingCancellation
        {
            UserId = subscription.UserId,
            BillingSubscriptionId = subscription.Id,
            AsaasSubscriptionId = subscription.AsaasSubscriptionId!,
            Reason = BillingCancellationReason.UserRequest,
            Status = BillingCancellationStatus.Pending
        };
        setupDb.BillingCancellations.Add(request);
        await setupDb.SaveChangesAsync();

        var fake = new FakeAsaasClient(AsaasCancellationOutcome.Confirmed, TimeSpan.FromMilliseconds(50));
        await using var firstDb = CreateDb(databaseName, root);
        await using var secondDb = CreateDb(databaseName, root);
        var first = CreateCancellationService(firstDb, fake);
        var second = CreateCancellationService(secondDb, fake);

        await Task.WhenAll(
            first.AttemptAsync(request.Id, manualRetry: true, CancellationToken.None),
            second.AttemptAsync(request.Id, manualRetry: true, CancellationToken.None));

        Assert.Equal(1, fake.Calls);
        Assert.Equal(
            BillingCancellationStatus.Confirmed,
            (await setupDb.BillingCancellations.AsNoTracking().SingleAsync()).Status);
    }

    [Fact]
    public async Task DeletedWebhookDuringAmbiguousAttemptWinsOverPendingResult()
    {
        var root = new InMemoryDatabaseRoot();
        var databaseName = Guid.NewGuid().ToString();
        await using var setupDb = CreateDb(databaseName, root);
        var subscription = AddSubscription(setupDb, "sub_webhook_race");
        var request = new BillingCancellation
        {
            UserId = subscription.UserId,
            BillingSubscriptionId = subscription.Id,
            AsaasSubscriptionId = subscription.AsaasSubscriptionId!,
            Reason = BillingCancellationReason.UserRequest,
            Status = BillingCancellationStatus.Pending
        };
        setupDb.BillingCancellations.Add(request);
        await setupDb.SaveChangesAsync();

        var fake = new CallbackAsaasClient(async () =>
        {
            await using var webhookDb = CreateDb(databaseName, root);
            var webhookService = CreateCancellationService(webhookDb, new FakeAsaasClient(AsaasCancellationOutcome.Pending));
            await webhookService.ConfirmFromWebhookAsync("sub_webhook_race", CancellationToken.None);
            await webhookDb.SaveChangesAsync();
        });
        await using var attemptDb = CreateDb(databaseName, root);
        var service = CreateCancellationService(attemptDb, fake);

        var result = await service.AttemptAsync(request.Id, manualRetry: true, CancellationToken.None);

        Assert.Equal(BillingCancellationStatus.Confirmed, result.Status);
        Assert.Equal(
            BillingCancellationStatus.Confirmed,
            (await setupDb.BillingCancellations.AsNoTracking().SingleAsync()).Status);
    }

    [Theory]
    [InlineData("PAYMENT_CONFIRMED")]
    [InlineData("PAYMENT_RECEIVED")]
    [InlineData("CHECKOUT_PAID")]
    [InlineData("SUBSCRIPTION_CREATED")]
    public async Task ConfirmedCancellationIsTerminalForOldActivationEvents(string oldEvent)
    {
        await using var db = CreateDb();
        var subscription = AddSubscription(db, "sub_terminal");
        db.BillingCancellations.Add(new BillingCancellation
        {
            UserId = subscription.UserId,
            BillingSubscriptionId = subscription.Id,
            AsaasSubscriptionId = "sub_terminal",
            Reason = BillingCancellationReason.UserRequest,
            Status = BillingCancellationStatus.Pending
        });
        await db.SaveChangesAsync();
        var service = CreateBillingService(db, new FakeAsaasClient(AsaasCancellationOutcome.Pending));

        await service.HandleWebhookAsync("webhook-test", Webhook("evt_deleted", "SUBSCRIPTION_DELETED", "sub_terminal"), CancellationToken.None);
        await service.HandleWebhookAsync("webhook-test", Webhook("evt_deleted", "SUBSCRIPTION_DELETED", "sub_terminal"), CancellationToken.None);
        await service.HandleWebhookAsync("webhook-test", Webhook("evt_old_distinct", oldEvent, "sub_terminal"), CancellationToken.None);

        await db.Entry(subscription).ReloadAsync();
        Assert.Equal(BillingPricing.Canceled, subscription.Status);
        Assert.True(subscription.CancelAtPeriodEnd);
        Assert.Equal(2, await db.BillingWebhookEvents.CountAsync());
        Assert.Equal(BillingCancellationStatus.Confirmed, (await db.BillingCancellations.SingleAsync()).Status);
    }

    private static AsaasClient CreateClient(params Func<HttpRequestMessage, HttpResponseMessage>[] responses)
    {
        var handler = new SequenceHandler(responses);
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://sandbox.invalid/v3/") };
        return new AsaasClient(
            http,
            Microsoft.Extensions.Options.Options.Create(new BillingOptions { AsaasApiKey = "test-key", AsaasBaseUrl = http.BaseAddress.ToString() }),
            NullLogger<AsaasClient>.Instance);
    }

    private static HttpResponseMessage Json(HttpStatusCode status, string body) =>
        new(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    private static TaNoMarDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<TaNoMarDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new TaNoMarDbContext(options);
    }

    private static TaNoMarDbContext CreateDb(string databaseName, InMemoryDatabaseRoot root)
    {
        var options = new DbContextOptionsBuilder<TaNoMarDbContext>()
            .UseInMemoryDatabase(databaseName, root)
            .Options;
        return new TaNoMarDbContext(options);
    }

    private static BillingSubscription AddSubscription(TaNoMarDbContext db, string remoteId)
    {
        var user = new User
        {
            Name = "Teste",
            Email = $"{Guid.NewGuid():N}@example.test",
            GoogleSubject = Guid.NewGuid().ToString(),
            PlanCode = "premium"
        };
        var subscription = new BillingSubscription
        {
            UserId = user.Id,
            PlanCode = "premium",
            Cycle = BillingPricing.Monthly,
            Status = BillingPricing.Active,
            AsaasSubscriptionId = remoteId,
            ExternalReference = Guid.NewGuid().ToString()
        };
        db.Users.Add(user);
        db.BillingSubscriptions.Add(subscription);
        db.SaveChanges();
        return subscription;
    }

    private static async Task<BillingSubscription> AddPendingUpgradeAsync(
        TaNoMarDbContext db,
        BillingSubscription oldSubscription)
    {
        var replacement = new BillingSubscription
        {
            UserId = oldSubscription.UserId,
            PlanCode = "capitao",
            Cycle = BillingPricing.Monthly,
            Status = BillingPricing.PendingCheckout,
            AsaasCheckoutId = "chk_upgrade",
            PreviousAsaasSubscriptionId = oldSubscription.AsaasSubscriptionId,
            ExternalReference = Guid.NewGuid().ToString(),
            PriceCents = 2490,
            RecurringPriceCents = 2490
        };
        db.Plans.Add(new Plan { Code = "capitao", Name = "Capitão", MonthlyPriceCents = 2490 });
        db.BillingSubscriptions.Add(replacement);
        await db.SaveChangesAsync();
        return replacement;
    }

    private static BillingCancellationService CreateCancellationService(TaNoMarDbContext db, IAsaasClient asaas) =>
        new(db, asaas, NullLogger<BillingCancellationService>.Instance);

    private static BillingService CreateBillingService(TaNoMarDbContext db, IAsaasClient asaas)
    {
        var cancellations = CreateCancellationService(db, asaas);
        return new BillingService(
            db,
            asaas,
            cancellations,
            new NotificationRealtimeHub(),
            new WebPushQueue(),
            new AdminNotificationQueue(),
            Microsoft.Extensions.Options.Options.Create(new BillingOptions
            {
                AsaasApiKey = "test-key",
                AsaasWebhookToken = "webhook-test"
            }),
            Microsoft.Extensions.Options.Options.Create(new TaNoMarOptions()),
            NullLogger<BillingService>.Instance);
    }

    private static JsonElement Webhook(string id, string eventName, string subscriptionId, string? checkoutId = null)
    {
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(new
        {
            id,
            @event = eventName,
            subscription = new { id = subscriptionId },
            checkout = checkoutId is null ? null : new { id = checkoutId }
        }));
        return document.RootElement.Clone();
    }

    private sealed class SequenceHandler(params Func<HttpRequestMessage, HttpResponseMessage>[] responses) : HttpMessageHandler
    {
        private int index;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var response = responses[Math.Min(Interlocked.Increment(ref index) - 1, responses.Length - 1)](request);
            return Task.FromResult(response);
        }
    }

    private sealed class FakeAsaasClient(AsaasCancellationOutcome outcome, TimeSpan? delay = null) : IAsaasClient
    {
        public int Calls { get; private set; }
        public AsaasCancellationOutcome Outcome { get; set; } = outcome;

        public Task<AsaasCheckoutCreated> CreateCheckoutAsync(AsaasCheckoutRequest request, CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public Task UpdateSubscriptionValueAsync(string subscriptionId, decimal value, bool updatePendingPayments, CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public async Task<AsaasCancellationOutcome> CancelSubscriptionAsync(string subscriptionId, CancellationToken cancellationToken)
        {
            Calls++;
            if (delay is not null) await Task.Delay(delay.Value, cancellationToken);
            return Outcome;
        }

        public Task<AsaasConfirmedCheckout?> FindConfirmedCheckoutAsync(string checkoutId, CancellationToken cancellationToken) =>
            throw new NotSupportedException();
    }

    private sealed class CallbackAsaasClient(Func<Task> callback) : IAsaasClient
    {
        public Task<AsaasCheckoutCreated> CreateCheckoutAsync(AsaasCheckoutRequest request, CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public Task UpdateSubscriptionValueAsync(string subscriptionId, decimal value, bool updatePendingPayments, CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public async Task<AsaasCancellationOutcome> CancelSubscriptionAsync(string subscriptionId, CancellationToken cancellationToken)
        {
            await callback();
            return AsaasCancellationOutcome.Pending;
        }

        public Task<AsaasConfirmedCheckout?> FindConfirmedCheckoutAsync(string checkoutId, CancellationToken cancellationToken) =>
            throw new NotSupportedException();
    }
}
