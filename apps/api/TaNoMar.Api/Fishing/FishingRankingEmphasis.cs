namespace TaNoMar.Api.Fishing;

internal static class FishingRankingEmphasis
{
    public const string Wind = "wind";
    public const string WindMore = "wind-more";
    public const string Rain = "rain";
    public const string RainMore = "rain-more";
    public const string Waves = "waves";
    public const string WavesLess = "waves-less";

    public static bool TryParse(string? value, out string? emphasis)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            emphasis = null;
            return true;
        }

        var normalized = value.Trim().ToLowerInvariant();
        if (normalized is Wind or WindMore or Rain or RainMore or Waves or WavesLess)
        {
            emphasis = normalized;
            return true;
        }

        emphasis = null;
        return false;
    }

    public static bool RequiresPremium(string? emphasis) => emphasis is not null;

    public static IReadOnlyList<FishingLocationForecast> Order(
        IReadOnlyList<FishingLocationForecast> ranking,
        string? emphasis)
    {
        var available = ranking.Where(FishingForecastAvailability.IsDailyScoreAvailable).ToList();
        return emphasis switch
        {
            Wind => Finish(OrderWind(available, more: false)),
            WindMore => Finish(OrderWind(available, more: true)),
            Rain => Finish(OrderRain(available, more: false)),
            RainMore => Finish(OrderRain(available, more: true)),
            Waves => Finish(OrderWaves(available, more: true)),
            WavesLess => Finish(OrderWaves(available, more: false)),
            _ => available
        };
    }

    private static IOrderedEnumerable<FishingLocationForecast> OrderWind(
        IReadOnlyList<FishingLocationForecast> ranking,
        bool more)
    {
        return more
            ? ranking.OrderByDescending(item => item.BestHour!.WindSpeedKmh!.Value)
            : ranking.OrderBy(item => item.BestHour!.WindSpeedKmh!.Value);
    }

    private static IOrderedEnumerable<FishingLocationForecast> OrderRain(
        IReadOnlyList<FishingLocationForecast> ranking,
        bool more)
    {
        return more
            ? ranking
                .OrderByDescending(item => item.BestHour!.RainMm!.Value)
                .ThenByDescending(item => item.BestHour!.RainProbability!.Value)
            : ranking
                .OrderBy(item => item.BestHour!.RainMm!.Value)
                .ThenBy(item => item.BestHour!.RainProbability!.Value);
    }

    private static IOrderedEnumerable<FishingLocationForecast> OrderWaves(
        IReadOnlyList<FishingLocationForecast> ranking,
        bool more)
    {
        return more
            ? ranking.OrderByDescending(item => item.BestHour!.WaveMeters!.Value)
            : ranking.OrderBy(item => item.BestHour!.WaveMeters!.Value);
    }

    private static IReadOnlyList<FishingLocationForecast> Finish(
        IOrderedEnumerable<FishingLocationForecast> ordered) =>
        ordered
            .ThenByDescending(item => item.Score)
            .ThenBy(item => item.Location, StringComparer.OrdinalIgnoreCase)
            .ToList();
}
