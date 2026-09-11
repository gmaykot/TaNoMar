using Microsoft.EntityFrameworkCore;
using TaNoMar.Api.Admin;
using TaNoMar.Api.Billing;
using TaNoMar.Api.Data;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class AdminDashboardTests
{
    [Theory]
    [InlineData(BillingPricing.Monthly, 1990, 1990)]
    [InlineData(BillingPricing.Yearly, 19104, 1592)]
    [InlineData("yearly", 1200, 100)]
    public void MonthlyEquivalentCents_NormalizesCycle(string cycle, int recurringCents, int expected)
    {
        Assert.Equal(expected, AdminDashboard.MonthlyEquivalentCents(cycle, recurringCents));
    }

    [Fact]
    public async Task Snapshot_aggregates_users_spots_billing_and_attention_queues()
    {
        using var db = CreateDb();
        var now = new DateTimeOffset(2026, 9, 10, 22, 0, 0, TimeSpan.Zero);
        var official = new FishingSpot("campeche", "Campeche", "sul", -27.65, -48.47, 110, "praia_aberta");
        var pending = new FishingSpot
        {
            Slug = "meu-costao",
            Name = "Meu costão",
            Region = "norte",
            Visibility = "shared",
            IsApproved = false,
            Latitude = -27.4,
            Longitude = -48.4
        };
        var personal = new FishingSpot
        {
            Slug = "secreto",
            Name = "Secreto",
            Region = "oeste",
            Visibility = "private",
            Latitude = -27.5,
            Longitude = -48.5
        };
        var noCoords = new FishingSpot
        {
            Slug = "sem-coordenadas",
            Name = "Sem coordenadas",
            Region = "ilhas",
            Visibility = "official",
            IsActive = false,
            IsFreeDefault = false
        };
        db.FishingSpots.AddRange(official, pending, personal, noCoords);
        db.Users.AddRange(
            new User { Name = "Ana", Email = "ana@example.com", GoogleSubject = "ana", Role = "Admin", PlanCode = "premium", CreatedAt = now.AddDays(-2) },
            new User { Name = "Beto", Email = "beto@example.com", GoogleSubject = "beto", Role = "User", PlanCode = "free", IsActive = false, CreatedAt = now.AddDays(-40) },
            new User { Name = "Cida", Email = "cida@example.com", GoogleSubject = "cida", Role = "User", PlanCode = "arrais", CreatedAt = now.AddDays(-20) });
        db.FishingSpotWebcams.Add(new FishingSpotWebcam
        {
            FishingSpotId = official.Id,
            Provider = "youtube",
            ExternalId = "live-1",
            Name = "Campeche",
            IsActive = true
        });
        db.BillingSubscriptions.AddRange(
            new BillingSubscription
            {
                UserId = Guid.NewGuid(),
                PlanCode = "premium",
                Cycle = BillingPricing.Monthly,
                Status = BillingPricing.Active,
                RecurringPriceCents = 1990
            },
            new BillingSubscription
            {
                UserId = Guid.NewGuid(),
                PlanCode = "capitao",
                Cycle = BillingPricing.Yearly,
                Status = BillingPricing.Active,
                CancelAtPeriodEnd = true,
                RecurringPriceCents = 23904
            },
            new BillingSubscription
            {
                UserId = Guid.NewGuid(),
                PlanCode = "arrais",
                Cycle = BillingPricing.Monthly,
                Status = BillingPricing.PastDue,
                RecurringPriceCents = 1490
            },
            new BillingSubscription
            {
                UserId = Guid.NewGuid(),
                PlanCode = "arrais",
                Cycle = BillingPricing.Monthly,
                Status = BillingPricing.Canceled,
                RecurringPriceCents = 1490,
                CurrentPeriodEnd = now.AddDays(10)
            });
        db.Partners.AddRange(
            new Partner { Slug = "loja-a", Name = "Loja A", IsPublished = true, IsFeatured = true },
            new Partner { Slug = "guia-b", Name = "Guia B", IsPublished = false });
        db.CommunityReports.Add(new CommunityReport
        {
            UserId = Guid.NewGuid(),
            FishingSpotId = official.Id,
            Type = "condicao",
            CreatedAt = now.AddDays(-1),
            ExpiresAt = now.AddHours(6)
        });
        db.ForecastAlerts.Add(new ForecastAlert { UserId = Guid.NewGuid(), FishingSpotId = official.Id, IsActive = true });
        await db.SaveChangesAsync();

        var snapshot = await AdminDashboard.SnapshotAsync(db, now, CancellationToken.None);

        Assert.Equal(3, snapshot.Users.Total);
        Assert.Equal(2, snapshot.Users.Active);
        Assert.Equal(1, snapshot.Users.Blocked);
        Assert.Equal(1, snapshot.Users.Admins);
        Assert.Equal(2, snapshot.Users.Paid);
        Assert.Equal(1, snapshot.Users.NewLast7Days);
        Assert.Equal(2, snapshot.Users.NewLast30Days);
        Assert.Equal(1, snapshot.Users.ByPlan.Single(item => item.Code == "free").Count);
        Assert.Equal(1, snapshot.Users.ByPlan.Single(item => item.Code == "arrais").Count);
        Assert.Equal(1, snapshot.Users.ByPlan.Single(item => item.Code == "premium").Count);
        Assert.Equal(2, snapshot.Spots.Official);
        Assert.Equal(1, snapshot.Spots.OfficialEnabled);
        Assert.Equal(1, snapshot.Spots.OfficialDisabled);
        Assert.Equal(1, snapshot.Spots.OfficialWithoutCoordinates);
        Assert.Equal(1, snapshot.Spots.OfficialWithWebcam);
        Assert.Equal(1, snapshot.Spots.Personal);
        Assert.Equal(1, snapshot.Spots.SharedPending);
        Assert.Equal(0, snapshot.Spots.SharedApproved);
        Assert.Equal(1, snapshot.Spots.ByRegion.Single(item => item.Code == "sul").Count);
        Assert.Equal(1, snapshot.Spots.ByRegion.Single(item => item.Code == "ilhas").Count);
        Assert.Equal(2, snapshot.Billing.Active);
        Assert.Equal(1, snapshot.Billing.CancelAtPeriodEnd);
        Assert.Equal(1, snapshot.Billing.PastDue);
        Assert.Equal(1, snapshot.Billing.CanceledWithAccess);
        Assert.Equal(1, snapshot.Billing.MonthlyCount);
        Assert.Equal(1, snapshot.Billing.YearlyCount);
        Assert.Equal(1990 + 1992, snapshot.Billing.MonthlyRecurringCents);
        Assert.Equal(1, snapshot.Engagement.ActiveAlerts);
        Assert.Equal(1, snapshot.Engagement.ActiveReports);
        Assert.Equal(1, snapshot.Engagement.ReportsLast7Days);
        Assert.Equal(1, snapshot.Partners.Published);
        Assert.Equal(1, snapshot.Partners.Unpublished);
        Assert.Equal(1, snapshot.Partners.Featured);
    }

    private static TaNoMarDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<TaNoMarDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new TaNoMarDbContext(options);
        db.Plans.AddRange(
            new Plan { Id = Guid.NewGuid(), Code = "free", Name = "Free", SortOrder = 0 },
            new Plan { Id = Guid.NewGuid(), Code = "arrais", Name = "Arrais", SortOrder = 1 },
            new Plan { Id = Guid.NewGuid(), Code = "premium", Name = "Mestre", SortOrder = 2 },
            new Plan { Id = Guid.NewGuid(), Code = "capitao", Name = "Capitão", SortOrder = 3 });
        return db;
    }
}
