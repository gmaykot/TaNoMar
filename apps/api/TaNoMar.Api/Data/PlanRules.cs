namespace TaNoMar.Api.Data;

internal static class PlanRules
{
    public const string Free = "free";
    public const string Arrais = "arrais";
    public const string Mestre = "premium";
    public const string Capitao = "capitao";
    public const string RequiredPlanLabel = "Assinatura";
    public const int MaxForecastDaysCap = 8;

    public static bool IsPaid(string? planCode) =>
        !string.IsNullOrWhiteSpace(planCode)
        && !string.Equals(planCode, Free, StringComparison.OrdinalIgnoreCase);

    public static string? NormalizeAssignable(string? planCode)
    {
        var code = planCode?.Trim().ToLowerInvariant();
        if (code is "mestre") return Mestre;
        return code is Free or Arrais or Mestre or Capitao ? code : null;
    }

    public static object CatalogDto(Plan plan) => new
    {
        code = plan.Code,
        name = plan.Name,
        tagline = plan.Tagline,
        monthlyPriceCents = plan.MonthlyPriceCents,
        featured = plan.Featured,
        sortOrder = plan.SortOrder,
        entitlements = new
        {
            maxForecastDays = plan.MaxForecastDays,
            maxFavorites = plan.MaxFavorites,
            maxPersonalSpots = plan.MaxPersonalSpots,
            maxAlerts = plan.MaxAlerts
        },
        modules = ModulesDto(plan)
    };

    public static object ModulesDto(Plan plan) => new
    {
        marine = plan.CanMarine,
        diary = plan.CanDiary,
        offline = plan.CanOffline,
        customMetrics = plan.CanCustomMetrics,
        communityVote = plan.CanCommunityVote,
        rankingEmphasis = plan.CanRankingEmphasis
    };

    public static string? ValidateUpdate(string name, string tagline, int monthlyPriceCents, int sortOrder, int maxForecastDays, int maxFavorites, int maxPersonalSpots, int maxAlerts)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 40) return "Informe um nome com até 40 caracteres.";
        if (tagline.Length > 160) return "O texto de apoio deve ter até 160 caracteres.";
        if (monthlyPriceCents is < 0 or > 999_900) return "Informe um preço mensal entre R$ 0,00 e R$ 9.999,00.";
        if (sortOrder is < 0 or > 99) return "A ordem deve ficar entre 0 e 99.";
        if (maxForecastDays is < 1 or > MaxForecastDaysCap) return $"Os dias de previsão devem ficar entre 1 e {MaxForecastDaysCap}.";
        if (maxFavorites is < 0 or > 200) return "Os favoritos devem ficar entre 0 e 200.";
        if (maxPersonalSpots is < 0 or > 100) return "Os locais pessoais devem ficar entre 0 e 100.";
        if (maxAlerts is < 0 or > 100) return "Os alertas devem ficar entre 0 e 100.";
        return null;
    }

    public static void ApplyUpdate(
        Plan plan,
        string name,
        string tagline,
        int monthlyPriceCents,
        int sortOrder,
        bool featured,
        int maxForecastDays,
        int maxFavorites,
        int maxPersonalSpots,
        int maxAlerts,
        bool canMarine,
        bool canDiary,
        bool canOffline,
        bool canCustomMetrics,
        bool canCommunityVote,
        bool canRankingEmphasis)
    {
        plan.Name = name.Trim();
        plan.Tagline = tagline.Trim();
        plan.MonthlyPriceCents = monthlyPriceCents;
        plan.SortOrder = sortOrder;
        plan.Featured = featured;
        plan.MaxForecastDays = maxForecastDays;
        plan.MaxFavorites = maxFavorites;
        plan.MaxPersonalSpots = maxPersonalSpots;
        plan.MaxAlerts = maxAlerts;
        plan.CanMarine = canMarine;
        plan.CanDiary = canDiary;
        plan.CanOffline = canOffline;
        plan.CanCustomMetrics = canCustomMetrics;
        plan.CanCommunityVote = canCommunityVote;
        plan.CanRankingEmphasis = canRankingEmphasis;
    }
}
