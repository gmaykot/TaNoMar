using System.Net;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using TaNoMar.Api.Billing;
using TaNoMar.Api.Data;
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
        var user = new User { Name = "Teste", Email = $"{Guid.NewGuid():N}@example.test", GoogleSubject = Guid.NewGuid().ToString() };
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

    private static BillingCancellationService CreateCancellationService(TaNoMarDbContext db, IAsaasClient asaas) =>
        new(db, asaas, NullLogger<BillingCancellationService>.Instance);

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
