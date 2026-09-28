using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using TaNoMar.Api.Billing;
using TaNoMar.Api.Data;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class BillingCancellationPostgresTests
{
    private const string ConnectionVariable = "TANOMAR_TEST_POSTGRES";
    private const string PreviousMigration = "20260925165538_AddPlanSpotTripPlanModule";
    private const string OriginalCancellationMigration = "20260927214652_AddBillingCancellationLifecycle";

    [Fact]
    public async Task FreshDatabaseBackfillsOnlyCanceledCurrentAndPaidUpgradePreviousIds()
    {
        await using var database = await PostgresTestDatabase.CreateRequiredAsync();
        await using (var before = database.CreateContext())
        {
            await before.Database.GetService<IMigrator>().MigrateAsync(PreviousMigration);
            var user = new User
            {
                Name = "Migration test",
                Email = $"{Guid.NewGuid():N}@example.test",
                GoogleSubject = Guid.NewGuid().ToString()
            };
            before.Users.Add(user);
            before.BillingSubscriptions.AddRange(
                Subscription(user.Id, BillingPricing.Canceled, "sub_current_canceled", null, true),
                Subscription(user.Id, BillingPricing.Active, "sub_legitimate_active", null, false),
                Subscription(user.Id, BillingPricing.Active, "sub_paid_replacement", "sub_paid_previous", false, paid: true),
                Subscription(user.Id, BillingPricing.Expired, "sub_abandoned_replacement", "sub_legitimate_active", false),
                Subscription(user.Id, BillingPricing.PendingCheckout, null, "sub_pending_previous", false),
                Subscription(user.Id, BillingPricing.Active, "sub_paid_replacement_2", "sub_paid_previous", false, paid: true));
            await before.SaveChangesAsync();
            await before.Database.GetService<IMigrator>().MigrateAsync();
        }

        await using var after = database.CreateContext();
        var rows = await after.BillingCancellations.AsNoTracking()
            .OrderBy(item => item.AsaasSubscriptionId)
            .ToListAsync();

        Assert.Equal(
            ["sub_current_canceled", "sub_paid_previous"],
            rows.Select(item => item.AsaasSubscriptionId).ToArray());
        Assert.All(rows, item => Assert.Equal(BillingCancellationStatus.Pending, item.Status));
        Assert.All(rows, item => Assert.Equal(BillingCancellationReason.LegacyReconciliation, item.Reason));
        Assert.DoesNotContain(rows, item => item.AsaasSubscriptionId == "sub_legitimate_active");
        Assert.DoesNotContain(rows, item => item.AsaasSubscriptionId == "sub_pending_previous");
    }

    [Fact]
    public async Task IncrementalMigrationWorksWhenOriginalCancellationMigrationIsAlreadyApplied()
    {
        await using var database = await PostgresTestDatabase.CreateRequiredAsync();
        await using (var original = database.CreateContext())
        {
            await original.Database.GetService<IMigrator>().MigrateAsync(OriginalCancellationMigration);
            var user = new User
            {
                Name = "Incremental migration test",
                Email = $"{Guid.NewGuid():N}@example.test",
                GoogleSubject = Guid.NewGuid().ToString()
            };
            original.Users.Add(user);
            original.BillingSubscriptions.AddRange(
                Subscription(user.Id, BillingPricing.Active, "sub_new_paid", "sub_old_paid", false, paid: true),
                Subscription(user.Id, BillingPricing.Expired, "sub_abandoned", "sub_still_legitimate", false));
            await original.SaveChangesAsync();
            await original.Database.GetService<IMigrator>().MigrateAsync();
        }

        await using var after = database.CreateContext();
        var rows = await after.BillingCancellations.AsNoTracking().ToListAsync();
        var candidate = Assert.Single(rows);
        Assert.Equal("sub_old_paid", candidate.AsaasSubscriptionId);
        Assert.Equal(BillingCancellationStatus.Pending, candidate.Status);
        Assert.Equal(0, await after.AccountDeletionReceipts.CountAsync());
        Assert.DoesNotContain(rows, item => item.AsaasSubscriptionId == "sub_still_legitimate");
    }

    [Fact]
    public async Task PreparingDeletionDoesNotCreateWorkOrCallRemoteCancellation()
    {
        await using var database = await PostgresTestDatabase.CreateRequiredAsync();
        await using var db = database.CreateContext();
        await db.Database.MigrateAsync();
        var subscription = AddSubscription(db, "sub_prepare_only");
        await db.SaveChangesAsync();
        var fake = new CountingAsaasClient(AsaasCancellationOutcome.Confirmed);
        var service = Service(db, fake);

        var preparation = await service.PrepareAccountDeletionAsync(subscription.UserId, CancellationToken.None);
        await service.ProcessDueAsync(CancellationToken.None);

        Assert.NotEmpty(preparation.Protocol);
        Assert.Empty(await db.BillingCancellations.AsNoTracking().ToListAsync());
        Assert.Equal(0, fake.Calls);
        Assert.Equal(AccountDeletionStatus.Prepared, (await db.AccountDeletionReceipts.SingleAsync()).Status);
    }

    [Fact]
    public async Task AtomicLeaseAllowsOnlyOneWorkerAcrossSeparateConnections()
    {
        await using var database = await PostgresTestDatabase.CreateRequiredAsync();
        Guid cancellationId;
        await using (var setup = database.CreateContext())
        {
            await setup.Database.MigrateAsync();
            var subscription = AddSubscription(setup, "sub_parallel_pg");
            var cancellation = Pending(subscription);
            setup.BillingCancellations.Add(cancellation);
            await setup.SaveChangesAsync();
            cancellationId = cancellation.Id;
        }

        var fake = new CountingAsaasClient(AsaasCancellationOutcome.Confirmed, TimeSpan.FromMilliseconds(200));
        await using var firstDb = database.CreateContext();
        await using var secondDb = database.CreateContext();
        var first = Service(firstDb, fake);
        var second = Service(secondDb, fake);

        await Task.WhenAll(
            first.AttemptAsync(cancellationId, manualRetry: false, CancellationToken.None),
            second.AttemptAsync(cancellationId, manualRetry: false, CancellationToken.None));

        Assert.Equal(1, fake.Calls);
        await using var verification = database.CreateContext();
        Assert.Equal(
            BillingCancellationStatus.Confirmed,
            (await verification.BillingCancellations.AsNoTracking().SingleAsync()).Status);
    }

    [Fact]
    public async Task ExpiredLeaseIsRecoveredAfterWorkerRestart()
    {
        await using var database = await PostgresTestDatabase.CreateRequiredAsync();
        Guid cancellationId;
        await using (var setup = database.CreateContext())
        {
            await setup.Database.MigrateAsync();
            var subscription = AddSubscription(setup, "sub_restart_pg");
            var cancellation = Pending(subscription);
            cancellation.LeaseOwner = Guid.NewGuid();
            cancellation.LeaseExpiresAt = DateTimeOffset.UtcNow.AddMinutes(2);
            setup.BillingCancellations.Add(cancellation);
            await setup.SaveChangesAsync();
            cancellationId = cancellation.Id;
        }

        var fake = new CountingAsaasClient(AsaasCancellationOutcome.Confirmed);
        await using (var blockedDb = database.CreateContext())
            await Service(blockedDb, fake).AttemptAsync(cancellationId, manualRetry: false, CancellationToken.None);
        Assert.Equal(0, fake.Calls);

        await using (var expireDb = database.CreateContext())
        {
            await expireDb.BillingCancellations.Where(item => item.Id == cancellationId)
                .ExecuteUpdateAsync(setters => setters.SetProperty(
                    item => item.LeaseExpiresAt,
                    DateTimeOffset.UtcNow.AddSeconds(-1)));
        }
        await using (var restartedDb = database.CreateContext())
            await Service(restartedDb, fake).AttemptAsync(cancellationId, manualRetry: false, CancellationToken.None);

        Assert.Equal(1, fake.Calls);
        await using var verification = database.CreateContext();
        var row = await verification.BillingCancellations.AsNoTracking().SingleAsync();
        Assert.Equal(BillingCancellationStatus.Confirmed, row.Status);
        Assert.Null(row.LeaseOwner);
        Assert.Null(row.LeaseExpiresAt);
    }

    private static BillingSubscription Subscription(
        Guid userId,
        string status,
        string? currentId,
        string? previousId,
        bool cancelAtPeriodEnd,
        bool paid = false) => new()
        {
            UserId = userId,
            PlanCode = "premium",
            Cycle = BillingPricing.Monthly,
            Status = status,
            AsaasSubscriptionId = currentId,
            PreviousAsaasSubscriptionId = previousId,
            CancelAtPeriodEnd = cancelAtPeriodEnd,
            PeriodStart = paid ? DateTimeOffset.UtcNow.AddDays(-2) : null,
            CurrentPeriodEnd = paid ? DateTimeOffset.UtcNow.AddDays(28) : null,
            ExternalReference = Guid.NewGuid().ToString()
        };

    private static BillingSubscription AddSubscription(TaNoMarDbContext db, string remoteId)
    {
        var user = new User
        {
            Name = "Postgres test",
            Email = $"{Guid.NewGuid():N}@example.test",
            GoogleSubject = Guid.NewGuid().ToString()
        };
        var subscription = Subscription(user.Id, BillingPricing.Active, remoteId, null, false);
        db.Users.Add(user);
        db.BillingSubscriptions.Add(subscription);
        return subscription;
    }

    private static BillingCancellation Pending(BillingSubscription subscription) => new()
    {
        UserId = subscription.UserId,
        BillingSubscriptionId = subscription.Id,
        AsaasSubscriptionId = subscription.AsaasSubscriptionId!,
        Reason = BillingCancellationReason.UserRequest,
        Status = BillingCancellationStatus.Pending,
        NextAttemptAt = DateTimeOffset.UtcNow
    };

    private static BillingCancellationService Service(TaNoMarDbContext db, IAsaasClient asaas) =>
        new(db, asaas, NullLogger<BillingCancellationService>.Instance);

    private sealed class CountingAsaasClient(
        AsaasCancellationOutcome outcome,
        TimeSpan? delay = null) : IAsaasClient
    {
        private int calls;
        public int Calls => calls;

        public Task<AsaasCheckoutCreated> CreateCheckoutAsync(AsaasCheckoutRequest request, CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public Task UpdateSubscriptionValueAsync(string subscriptionId, decimal value, bool updatePendingPayments, CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public async Task<AsaasCancellationOutcome> CancelSubscriptionAsync(string subscriptionId, CancellationToken cancellationToken)
        {
            Interlocked.Increment(ref calls);
            if (delay is not null) await Task.Delay(delay.Value, cancellationToken);
            return outcome;
        }

        public Task<AsaasConfirmedCheckout?> FindConfirmedCheckoutAsync(string checkoutId, CancellationToken cancellationToken) =>
            throw new NotSupportedException();
    }

    private sealed class PostgresTestDatabase : IAsyncDisposable
    {
        private readonly string baseConnectionString;
        private readonly string schema;

        private PostgresTestDatabase(string baseConnectionString, string schema)
        {
            this.baseConnectionString = baseConnectionString;
            this.schema = schema;
        }

        public static async Task<PostgresTestDatabase> CreateRequiredAsync()
        {
            var connectionString = Environment.GetEnvironmentVariable(ConnectionVariable);
            if (string.IsNullOrWhiteSpace(connectionString))
                throw new InvalidOperationException(
                    $"Gate B1 exige PostgreSQL real. Defina {ConnectionVariable} para executar estes testes.");
            var database = new PostgresTestDatabase(connectionString, $"billing_{Guid.NewGuid():N}");
            try
            {
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();
                await using var command = new NpgsqlCommand($"CREATE SCHEMA \"{database.schema}\"", connection);
                await command.ExecuteNonQueryAsync();
                return database;
            }
            catch (NpgsqlException exception)
            {
                throw new InvalidOperationException(
                    $"Gate B1 exige PostgreSQL real, mas o banco de teste está indisponível ({exception.GetType().Name}).",
                    exception);
            }
        }

        public TaNoMarDbContext CreateContext()
        {
            var builder = new NpgsqlConnectionStringBuilder(baseConnectionString) { SearchPath = schema };
            var options = new DbContextOptionsBuilder<TaNoMarDbContext>()
                .UseNpgsql(builder.ConnectionString, postgres => postgres.MigrationsHistoryTable("__EFMigrationsHistory", schema))
                .Options;
            return new TaNoMarDbContext(options);
        }

        public async ValueTask DisposeAsync()
        {
            await using var connection = new NpgsqlConnection(baseConnectionString);
            await connection.OpenAsync();
            await using var command = new NpgsqlCommand($"DROP SCHEMA IF EXISTS \"{schema}\" CASCADE", connection);
            await command.ExecuteNonQueryAsync();
        }
    }
}
