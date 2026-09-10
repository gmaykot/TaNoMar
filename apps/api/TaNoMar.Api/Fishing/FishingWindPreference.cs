namespace TaNoMar.Api.Fishing;

internal static class FishingWindPreference
{
    public static FishingLocationForecast Apply(
        FishingLocationForecast forecast,
        int? idealWindDirectionDegrees,
        double? seaOrientationDegrees,
        string profile)
    {
        if (idealWindDirectionDegrees is null) return forecast;

        var scoreOrientation = (idealWindDirectionDegrees.Value + 180) % 360;
        var hours = forecast.Hours.Select(hour =>
        {
            var windDirection = hour.WindDirectionDegrees ?? DirectionDegrees(hour.WindDirection);
            if (windDirection is null) return hour;
            var clockHour = int.Parse(hour.Time.AsSpan(0, 2));
            return hour with
            {
                Score = FishingScoreCalculator.Calculate(
                    hour.WindSpeedKmh,
                    hour.WindGustKmh,
                    windDirection.Value,
                    scoreOrientation,
                    hour.WaveMeters,
                    hour.WavePeriodSeconds,
                    hour.RainProbability,
                    hour.RainMm,
                    clockHour,
                    profile),
                WindOrigin = FishingScoreCalculator.WindOrigin(windDirection.Value, seaOrientationDegrees)
            };
        }).ToList();
        var bestHours = hours
            .Where(hour => int.Parse(hour.Time.AsSpan(0, 2)) is >= 5 and <= 20)
            .OrderByDescending(hour => hour.Score)
            .ThenBy(hour => hour.Time, StringComparer.Ordinal)
            .Take(3)
            .ToList();
        var score = bestHours.Count > 0
            ? Math.Round(bestHours.Average(hour => hour.Score), 1, MidpointRounding.ToEven)
            : 0.0;

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
