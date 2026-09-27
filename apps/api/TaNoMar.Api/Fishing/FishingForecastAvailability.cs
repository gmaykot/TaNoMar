namespace TaNoMar.Api.Fishing;

internal static class FishingForecastAvailability
{
    private const string DailyScoreUnavailable = "Nota diária indisponível.";

    public static bool IsDailyScoreAvailable(FishingLocationForecast forecast)
        => FishingForecastDataQuality.IsCurrent(forecast)
            && forecast.Score is not null
            && forecast.BestHours.Count == 3
            && forecast.BestHour is not null;

    public static FishingForecast FilterRanking(FishingForecast forecast)
    {
        var available = forecast.Ranking
            .Where(IsDailyScoreAvailable)
            .OrderByDescending(item => item.Score)
            .ToList();
        var unavailableIds = forecast.Ranking
            .Where(item => !IsDailyScoreAvailable(item))
            .Select(item => item.Id)
            .OrderBy(id => id, StringComparer.Ordinal);
        var errors = new List<FishingForecastError>();
        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (var error in forecast.Errors)
        {
            if (seen.Add(error.Location)) errors.Add(error);
        }
        foreach (var id in unavailableIds)
        {
            if (seen.Add(id)) errors.Add(new FishingForecastError(id, DailyScoreUnavailable));
        }

        return forecast with { Ranking = available, Errors = errors };
    }
}
