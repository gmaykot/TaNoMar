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

    public static IReadOnlyList<TideExtremePoint> ExtremesFromHeights(IReadOnlyList<(string Time, double Height)> points)
    {
        if (points.Count == 0) return [];
        if (points.Count == 1) return [new TideExtremePoint(points[0].Time, "preamar", points[0].Height)];
        if (points.Count == 2)
        {
            var first = points[0];
            var second = points[1];
            return first.Height >= second.Height
                ? [new TideExtremePoint(first.Time, "preamar", first.Height), new TideExtremePoint(second.Time, "baixa-mar", second.Height)]
                : [new TideExtremePoint(first.Time, "baixa-mar", first.Height), new TideExtremePoint(second.Time, "preamar", second.Height)];
        }

        var extremes = new List<TideExtremePoint>();
        for (var index = 0; index < points.Count; index++)
        {
            var previous = index == 0 ? points[1].Height : points[index - 1].Height;
            var current = points[index].Height;
            var next = index == points.Count - 1 ? points[index - 1].Height : points[index + 1].Height;
            if (current > previous && current >= next)
                extremes.Add(new TideExtremePoint(points[index].Time, "preamar", current));
            else if (current < previous && current <= next)
                extremes.Add(new TideExtremePoint(points[index].Time, "baixa-mar", current));
        }

        return extremes;
    }
}

internal sealed record TideExtremePoint(string Time, string Type, double HeightMeters);
