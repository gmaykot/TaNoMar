namespace TaNoMar.Api.Fishing;

internal static class FishingWindPreference
{
    public static FishingLocationForecast Apply(
        FishingLocationForecast forecast,
        int? idealWindDirectionDegrees,
        double? seaOrientationDegrees,
        string profile)
    {
        if (!FishingForecastDataQuality.IsCurrent(forecast)) return forecast;
        if (idealWindDirectionDegrees is null) return forecast;

        var scoreOrientation = (idealWindDirectionDegrees.Value + 180) % 360;
        var hours = forecast.Hours.Select(hour =>
        {
            if (hour.ScoreAvailability == FishingScoreAvailability.Unavailable || hour.Score is null)
                return hour;
            var windDirection = hour.WindDirectionDegrees ?? DirectionDegrees(hour.WindDirection);
            if (windDirection is null) return hour;
            var clockHour = int.Parse(hour.Time.AsSpan(0, 2));
            return hour with
            {
                Score = FishingScoreCalculator.Calculate(
                    hour.WindSpeedKmh!.Value,
                    hour.WindGustKmh!.Value,
                    windDirection.Value,
                    scoreOrientation,
                    hour.WaveMeters!.Value,
                    hour.WavePeriodSeconds!.Value,
                    hour.RainProbability!.Value,
                    hour.RainMm!.Value,
                    clockHour,
                    profile),
                WindOrigin = FishingScoreCalculator.WindOrigin(windDirection.Value, seaOrientationDegrees)
            };
        }).ToList();
        var dailyCandidates = hours
            .Where(hour => hour.Score is not null && int.Parse(hour.Time.AsSpan(0, 2)) is >= 5 and <= 20)
            .OrderByDescending(hour => hour.Score)
            .ThenBy(hour => hour.Time, StringComparer.Ordinal)
            .Take(3)
            .ToList();
        var dailyScoreAvailable = dailyCandidates.Count == 3;
        var bestHours = dailyScoreAvailable ? dailyCandidates : [];
        double? score = dailyScoreAvailable
            ? Math.Round(dailyCandidates.Average(hour => hour.Score!.Value), 1, MidpointRounding.ToEven)
            : null;

        return forecast with
        {
            Score = score,
            BestHours = bestHours,
            BestHour = bestHours.FirstOrDefault(),
            Hours = hours
        };
    }

    private static double? DirectionDegrees(string direction) => direction switch
    {
        "Norte" => 0,
        "Nordeste" => 45,
        "Leste" => 90,
        "Sudeste" => 135,
        "Sul" => 180,
        "Sudoeste" => 225,
        "Oeste" => 270,
        "Noroeste" => 315,
        _ => null
    };
}
