using Microsoft.EntityFrameworkCore;
using TaNoMar.Api.Billing;
using TaNoMar.Api.Data;

namespace TaNoMar.Api.Admin;

internal static class AdminDashboard
{
    internal static readonly string[] RegionOrder = ["norte", "leste", "sul", "oeste", "continente", "ilhas"];

    public static int MonthlyEquivalentCents(string cycle, int recurringPriceCents)
    {
        if (string.Equals(cycle, BillingPricing.Yearly, StringComparison.OrdinalIgnoreCase))
            return (int)Math.Round(recurringPriceCents / 12m, MidpointRounding.AwayFromZero);
        return Math.Max(0, recurringPriceCents);
    }

    public static async Task<AdminDashboardSnapshot> SnapshotAsync(
        TaNoMarDbContext db,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
        var startOfToday = BillingPricing.StartOfLocalDay(now, zone);
        var last7Days = startOfToday.AddDays(-6);
        var last30Days = startOfToday.AddDays(-29);

        var users = await db.Users.AsNoTracking()
            .Select(item => new { item.IsActive, item.Role, item.PlanCode, item.CreatedAt })
            .ToListAsync(cancellationToken);
        var plans = await db.Plans.AsNoTracking()
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.Name)
            .Select(item => new { item.Code, item.Name })
            .ToListAsync(cancellationToken);
        var spots = await db.FishingSpots.AsNoTracking()
            .Select(item => new
            {
                item.Id,
                item.Visibility,
                item.IsApproved,
                item.IsActive,
                item.IsFreeDefault,
                item.Latitude,
                item.Longitude,
                item.Region
            })
            .ToListAsync(cancellationToken);
        var webcamSpotIds = await db.FishingSpotWebcams.AsNoTracking()
            .Where(item => item.IsActive)
            .Select(item => item.FishingSpotId)
            .Distinct()
            .ToListAsync(cancellationToken);
        var subscriptions = await db.BillingSubscriptions.AsNoTracking()
            .Select(item => new
            {
                item.Status,
                item.CancelAtPeriodEnd,
                item.Cycle,
                item.RecurringPriceCents,
                item.CurrentPeriodEnd
            })
            .ToListAsync(cancellationToken);
        var partners = await db.Partners.AsNoTracking()
            .Select(item => new { item.IsPublished, item.IsFeatured })
            .ToListAsync(cancellationToken);

        var activeAlerts = await db.ForecastAlerts.AsNoTracking().CountAsync(item => item.IsActive, cancellationToken);
        var pushDevices = await db.PushSubscriptions.AsNoTracking().CountAsync(cancellationToken);
        var favorites = await db.FavoriteSpots.AsNoTracking().CountAsync(cancellationToken);
        var enabledSpots = await db.EnabledSpots.AsNoTracking().CountAsync(item => item.IsEnabled, cancellationToken);
        var activeReports = await db.CommunityReports.AsNoTracking()
            .CountAsync(item => item.ExpiresAt > now, cancellationToken);
        var reportsLast7Days = await db.CommunityReports.AsNoTracking()
            .CountAsync(item => item.CreatedAt >= last7Days, cancellationToken);
        var reportsLast30Days = await db.CommunityReports.AsNoTracking()
            .CountAsync(item => item.CreatedAt >= last30Days, cancellationToken);

        var webcamSet = webcamSpotIds.ToHashSet();
        var official = spots.Where(item => item.Visibility == "official").ToList();
        var byPlan = plans
            .Select(plan => new AdminDashboardCount(plan.Code, plan.Name, users.Count(item => item.PlanCode == plan.Code)))
            .ToList();
        var knownRegions = official
            .GroupBy(item => item.Region)
            .ToDictionary(group => group.Key, group => group.Count(), StringComparer.Ordinal);
        var byRegion = RegionOrder
            .Select(region => new AdminDashboardCount(region, region, knownRegions.GetValueOrDefault(region)))
            .Concat(knownRegions
                .Where(item => !RegionOrder.Contains(item.Key))
                .OrderBy(item => item.Key)
                .Select(item => new AdminDashboardCount(item.Key, item.Key, item.Value)))
            .ToList();

        var recurring = subscriptions
            .Where(item => item.Status == BillingPricing.Active)
            .ToList();

        return new AdminDashboardSnapshot(
            now,
            new AdminDashboardUsers(
                users.Count,
                users.Count(item => item.IsActive),
                users.Count(item => !item.IsActive),
                users.Count(item => string.Equals(item.Role, "Admin", StringComparison.Ordinal)),
                users.Count(item => item.IsActive && PlanRules.IsPaid(item.PlanCode)),
                users.Count(item => item.CreatedAt >= last7Days),
                users.Count(item => item.CreatedAt >= last30Days),
                byPlan),
            new AdminDashboardSpots(
                official.Count,
                official.Count(item => item.IsActive),
                official.Count(item => !item.IsActive),
                official.Count(item => item.IsFreeDefault),
                official.Count(item => item.Latitude is null || item.Longitude is null),
                official.Count(item => webcamSet.Contains(item.Id)),
                spots.Count(item => item.Visibility == "private"),
                spots.Count(item => item.Visibility == "shared" && item.IsApproved),
                spots.Count(item => item.Visibility == "shared" && !item.IsApproved),
                byRegion),
            new AdminDashboardBilling(
                recurring.Count,
                recurring.Count(item => item.CancelAtPeriodEnd),
                subscriptions.Count(item => item.Status == BillingPricing.PastDue),
                subscriptions.Count(item => item.Status == BillingPricing.PendingCheckout),
                subscriptions.Count(item =>
                    item.Status == BillingPricing.Canceled
                    && item.CurrentPeriodEnd is DateTimeOffset end
                    && end > now),
                recurring.Count(item => string.Equals(item.Cycle, BillingPricing.Monthly, StringComparison.OrdinalIgnoreCase)),
                recurring.Count(item => string.Equals(item.Cycle, BillingPricing.Yearly, StringComparison.OrdinalIgnoreCase)),
                recurring.Sum(item => MonthlyEquivalentCents(item.Cycle, item.RecurringPriceCents))),
            new AdminDashboardEngagement(
                activeAlerts,
                pushDevices,
                favorites,
                enabledSpots,
                activeReports,
                reportsLast7Days,
                reportsLast30Days),
            new AdminDashboardPartners(
                partners.Count(item => item.IsPublished),
                partners.Count(item => !item.IsPublished),
                partners.Count(item => item.IsFeatured)));
    }
}

internal sealed record AdminDashboardSnapshot(
    DateTimeOffset GeneratedAt,
    AdminDashboardUsers Users,
    AdminDashboardSpots Spots,
    AdminDashboardBilling Billing,
    AdminDashboardEngagement Engagement,
    AdminDashboardPartners Partners);

internal sealed record AdminDashboardUsers(
    int Total,
    int Active,
    int Blocked,
    int Admins,
    int Paid,
    int NewLast7Days,
    int NewLast30Days,
    IReadOnlyList<AdminDashboardCount> ByPlan);

internal sealed record AdminDashboardSpots(
    int Official,
    int OfficialEnabled,
    int OfficialDisabled,
    int OfficialFreeDefault,
    int OfficialWithoutCoordinates,
    int OfficialWithWebcam,
    int Personal,
    int SharedApproved,
    int SharedPending,
    IReadOnlyList<AdminDashboardCount> ByRegion);

internal sealed record AdminDashboardBilling(
    int Active,
    int CancelAtPeriodEnd,
    int PastDue,
    int PendingCheckout,
    int CanceledWithAccess,
    int MonthlyCount,
    int YearlyCount,
    int MonthlyRecurringCents);

internal sealed record AdminDashboardEngagement(
    int ActiveAlerts,
    int PushDevices,
    int Favorites,
    int EnabledSpots,
    int ActiveReports,
    int ReportsLast7Days,
    int ReportsLast30Days);

internal sealed record AdminDashboardPartners(int Published, int Unpublished, int Featured);

internal sealed record AdminDashboardCount(string Code, string Name, int Count);
