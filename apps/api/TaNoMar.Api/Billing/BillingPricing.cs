using TaNoMar.Api.Data;

namespace TaNoMar.Api.Billing;

internal static class BillingPricing
{
    public const string Monthly = "MONTHLY";
    public const string Yearly = "YEARLY";
    public const string PendingCheckout = "pending_checkout";
    public const string Active = "active";
    public const string PastDue = "past_due";
    public const string Canceled = "canceled";
    public const string Expired = "expired";

    public static int AnnualCents(int monthlyPriceCents) =>
        (int)Math.Round(monthlyPriceCents * 12 * (100 - BillingOptions.AnnualDiscountPercent) / 100m, MidpointRounding.AwayFromZero);

    public static int CatalogCents(Plan plan, string cycle) =>
        string.Equals(cycle, Monthly, StringComparison.OrdinalIgnoreCase)
            ? plan.MonthlyPriceCents
            : AnnualCents(plan.MonthlyPriceCents);

    public static decimal Reais(int cents) => Math.Round(cents / 100m, 2, MidpointRounding.AwayFromZero);

    public static string? NormalizeCycle(string? cycle)
    {
        var value = cycle?.Trim().ToUpperInvariant();
        return value is Monthly or Yearly ? value : null;
    }

    public static int Rank(string planCode) => planCode switch
    {
        PlanRules.Arrais => 1,
        PlanRules.Mestre => 2,
        PlanRules.Capitao => 3,
        _ => 0
    };

    public static bool IsUpgrade(string fromPlan, string fromCycle, string toPlan, string toCycle)
    {
        var fromRank = Rank(fromPlan);
        var toRank = Rank(toPlan);
        if (toRank > fromRank) return true;
        return fromRank == toRank
            && string.Equals(fromCycle, Monthly, StringComparison.Ordinal)
            && string.Equals(toCycle, Yearly, StringComparison.Ordinal);
    }

    public static bool IsDowngrade(string fromPlan, string fromCycle, string toPlan, string toCycle)
    {
        if (IsUpgrade(fromPlan, fromCycle, toPlan, toCycle)) return false;
        return Rank(toPlan) < Rank(fromPlan)
            || (Rank(fromPlan) == Rank(toPlan)
                && string.Equals(fromCycle, Yearly, StringComparison.Ordinal)
                && string.Equals(toCycle, Monthly, StringComparison.Ordinal));
    }

    public static int CreditCents(int contractedCents, DateTimeOffset periodStart, DateTimeOffset periodEnd, DateTimeOffset now)
    {
        var periodDays = Math.Max(1, (int)Math.Ceiling((periodEnd - periodStart).TotalDays));
        var remainingDays = Math.Max(0, (int)Math.Ceiling((periodEnd - now).TotalDays));
        return (int)Math.Round(contractedCents * remainingDays / (decimal)periodDays, MidpointRounding.AwayFromZero);
    }

    public static int FirstChargeCents(int catalogCents, int creditCents) =>
        Math.Max(1, catalogCents - creditCents);

    public static DateTimeOffset PeriodEnd(string cycle, DateTimeOffset start) =>
        string.Equals(cycle, Monthly, StringComparison.Ordinal) ? start.AddMonths(1) : start.AddYears(1);

    public static string ExternalReference(Guid userId, string planCode, string cycle) =>
        $"{userId:D}:{planCode}:{cycle}";
}
