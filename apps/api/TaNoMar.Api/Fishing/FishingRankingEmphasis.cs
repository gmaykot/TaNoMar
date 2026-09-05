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
        return emphasis switch
        {
            Wind => Finish(OrderWind(ranking, more: false)),
            WindMore => Finish(OrderWind(ranking, more: true)),
            Rain => Finish(OrderRain(ranking, more: false)),
            RainMore => Finish(OrderRain(ranking, more: true)),
            Waves => Finish(OrderWaves(ranking, more: true)),
            WavesLess => Finish(OrderWaves(ranking, more: false)),
            _ => ranking
        };
    }

    private static IOrderedEnumerable<FishingLocationForecast> OrderWind(
        IReadOnlyList<FishingLocationForecast> ranking,
        bool more)
    {
        var ordered = ranking.OrderBy(MissingBestHour);
        return more
            ? ordered.ThenByDescending(item => item.BestHour?.WindSpeedKmh ?? 0)
            : ordered.ThenBy(item => item.BestHour?.WindSpeedKmh ?? 0);
    }

    private static IOrderedEnumerable<FishingLocationForecast> OrderRain(
        IReadOnlyList<FishingLocationForecast> ranking,
        bool more)
    {
        var ordered = ranking.OrderBy(MissingBestHour);
        return more
            ? ordered
                .ThenByDescending(item => item.BestHour?.RainMm ?? 0)
                .ThenByDescending(item => item.BestHour?.RainProbability ?? 0)
            : ordered
                .ThenBy(item => item.BestHour?.RainMm ?? 0)
                .ThenBy(item => item.BestHour?.RainProbability ?? 0);
    }

    private static IOrderedEnumerable<FishingLocationForecast> OrderWaves(
        IReadOnlyList<FishingLocationForecast> ranking,
        bool more)
    {
        var ordered = ranking.OrderBy(MissingBestHour);
        return more
            ? ordered.ThenByDescending(item => item.BestHour?.WaveMeters ?? 0)
            : ordered.ThenBy(item => item.BestHour?.WaveMeters ?? 0);
    }

    private static IReadOnlyList<FishingLocationForecast> Finish(
        IOrderedEnumerable<FishingLocationForecast> ordered) =>
        ordered
            .ThenByDescending(item => item.Score)
            .ThenBy(item => item.Location, StringComparer.OrdinalIgnoreCase)
            .ToList();

    private static bool MissingBestHour(FishingLocationForecast item) => item.BestHour is null;
}
