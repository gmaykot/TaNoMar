namespace TaNoMar.Api.Fishing;

internal static class TideCurve
{
    public static IReadOnlyList<TideExtremePoint> Extremes(IReadOnlyList<FishingHourForecast> hours)
    {
        var points = hours
            .Where(hour => hour.SeaLevelHeightMsl.HasValue)
            .Select(hour => (hour.Time, Height: hour.SeaLevelHeightMsl!.Value))
            .ToList();
        if (points.Count < 3) return [];

        var extremes = new List<TideExtremePoint>();
        for (var index = 1; index < points.Count - 1; index++)
        {
            var previous = points[index - 1].Height;
            var current = points[index].Height;
            var next = points[index + 1].Height;
            if (current > previous && current >= next)
                extremes.Add(new TideExtremePoint(points[index].Time, "preamar", current));
            else if (current < previous && current <= next)
                extremes.Add(new TideExtremePoint(points[index].Time, "baixa-mar", current));
        }

        return extremes;
    }
}

internal sealed record TideExtremePoint(string Time, string Type, double HeightMeters);
