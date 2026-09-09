namespace TaNoMar.Api.Data;

internal static class PlanRules
{
    public const string Free = "free";
    public const string Arrais = "arrais";
    public const string Mestre = "premium";
    public const string Capitao = "capitao";
    public const string RequiredPlanLabel = "Assinatura";
    public const string DefaultBestHoursMode = "3";
    public const string CustomBestHoursMode = "custom";
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

    public static object CatalogDto(Plan plan, int activeUserCount = 0) => new
    {
        code = plan.Code,
        name = plan.Name,
        tagline = plan.Tagline,
        monthlyPriceCents = plan.MonthlyPriceCents,
        featured = plan.Featured,
        enabled = plan.IsEnabled,
        sortOrder = plan.SortOrder,
        activeUserCount,
        entitlements = new
        {
            maxForecastDays = plan.MaxForecastDays,
            bestHoursMode = plan.BestHoursMode,
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
        customWind = plan.CanCustomWind,
        communityVote = plan.CanCommunityVote,
        rankingEmphasis = plan.CanRankingEmphasis,
        liveWebcams = plan.CanLiveWebcams
    };

    public static string? ValidateUpdate(string name, string tagline, int monthlyPriceCents, int sortOrder, int maxForecastDays, string bestHoursMode, int maxFavorites, int maxPersonalSpots, int maxAlerts)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 40) return "Informe um nome com até 40 caracteres.";
        if (tagline.Length > 160) return "O texto de apoio deve ter até 160 caracteres.";
        if (monthlyPriceCents is < 0 or > 999_900) return "Informe um preço mensal entre R$ 0,00 e R$ 9.999,00.";
        if (sortOrder is < 0 or > 99) return "A ordem deve ficar entre 0 e 99.";
        if (maxForecastDays is < 1 or > MaxForecastDaysCap) return $"Os dias de previsão devem ficar entre 1 e {MaxForecastDaysCap}.";
        if (BestHourCount(bestHoursMode) is null) return "Use 1, 2, 3 ou Custom para os melhores horários.";
        if (maxFavorites is < 0 or > 200) return "Os favoritos devem ficar entre 0 e 200.";
        if (maxPersonalSpots is < 0 or > 100) return "Os locais pessoais devem ficar entre 0 e 100.";
        if (maxAlerts is < 0 or > 100) return "Os alertas devem ficar entre 0 e 100.";
        return null;
    }

    public static string? ValidateAvailability(string planCode, bool enabled, int activeUserCount)
    {
        if (enabled) return null;
        if (string.Equals(planCode, Free, StringComparison.OrdinalIgnoreCase))
            return "O plano Free permanece disponível.";
        if (activeUserCount == 1) return "Há 1 conta ativa neste plano. Mova essa conta antes de desligar.";
        if (activeUserCount > 1) return $"Há {activeUserCount} contas ativas neste plano. Mova essas contas antes de desligar.";
        return null;
    }

    public static void ApplyUpdate(
        Plan plan,
        string name,
        string tagline,
        int monthlyPriceCents,
        int sortOrder,
        bool featured,
        bool isEnabled,
        int maxForecastDays,
        string bestHoursMode,
        int maxFavorites,
        int maxPersonalSpots,
        int maxAlerts,
        bool canMarine,
        bool canDiary,
        bool canOffline,
        bool canCustomMetrics,
        bool canCustomWind,
        bool canCommunityVote,
        bool canRankingEmphasis,
        bool canLiveWebcams)
    {
        plan.Name = name.Trim();
        plan.Tagline = tagline.Trim();
        plan.MonthlyPriceCents = monthlyPriceCents;
        plan.SortOrder = sortOrder;
        plan.IsEnabled = isEnabled;
        plan.Featured = isEnabled && featured;
        plan.MaxForecastDays = maxForecastDays;
        plan.BestHoursMode = bestHoursMode;
        plan.MaxFavorites = maxFavorites;
        plan.MaxPersonalSpots = maxPersonalSpots;
        plan.MaxAlerts = maxAlerts;
        plan.CanMarine = canMarine;
        plan.CanDiary = canDiary;
        plan.CanOffline = canOffline;
        plan.CanCustomMetrics = canCustomMetrics;
        plan.CanCustomWind = canCustomWind;
        plan.CanCommunityVote = canCommunityVote;
        plan.CanRankingEmphasis = canRankingEmphasis;
        plan.CanLiveWebcams = canLiveWebcams;
    }

    public static int? BestHourCount(string? mode) => mode?.Trim().ToLowerInvariant() switch
    {
        "1" => 1,
        "2" => 2,
        "3" or CustomBestHoursMode => 3,
        _ => null
    };

    public static bool CanSelectAnyHour(string? mode) =>
        string.Equals(mode?.Trim(), CustomBestHoursMode, StringComparison.OrdinalIgnoreCase);
}
