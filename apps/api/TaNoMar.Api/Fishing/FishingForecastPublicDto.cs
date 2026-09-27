using TaNoMar.Api.Data;

namespace TaNoMar.Api.Fishing;

internal static class FishingForecastPublicDto
{
    public static object Day(
        FishingForecast forecast,
        bool paid,
        string bestHoursMode,
        HashSet<string>? ownerSpotIds = null,
        IReadOnlyDictionary<string, string>? visibilities = null,
        bool includeSelectableHours = false)
        => new
        {
            date = forecast.Date,
            ranking = forecast.Ranking
                .Select(item => Item(
                    item,
                    Quality(item, forecast.QualityContext),
                    paid,
                    bestHoursMode,
                    ownerSpotIds,
                    visibilities,
                    includeSelectableHours))
                .ToList(),
            unavailableSpotIds = forecast.Errors
                .Select(error => error.Location)
                .Distinct(StringComparer.Ordinal)
                .ToList()
        };

    private static FishingForecastQualityDto? Quality(
        FishingLocationForecast forecast,
        ForecastQualityContext? context)
    {
        if (context is null || !context.Snapshots.TryGetValue(forecast.Id, out var snapshot))
            return null;

        return FishingForecastQualityDto.Create(
            forecast,
            snapshot,
            context.RefreshAfter,
            context.MaxStale,
            context.EvaluatedAt);
    }

    private static object Item(
        FishingLocationForecast item,
        FishingForecastQualityDto? quality,
        bool paid,
        string bestHoursMode,
        HashSet<string>? ownerSpotIds,
        IReadOnlyDictionary<string, string>? visibilities,
        bool includeSelectableHours)
    {
        if (!FishingForecastAvailability.IsDailyScoreAvailable(item))
            throw new InvalidOperationException("An unavailable daily score cannot be mapped to the public DTO.");

        var hour = item.BestHour;
        var bestHours = item.BestHours.Take(PlanRules.BestHourCount(bestHoursMode) ?? 3).ToArray();
        object Available(object value) => new { state = "available", value };
        object Locked() => new { state = "locked", reason = "plan_required", requiredPlan = PlanRules.RequiredPlanLabel };
        var score = item.Score!.Value;
        var classification = ForecastHourWindowDto.Classification(score);
        var highlights = ForecastHourWindowDto.Highlights(hour);
        var windOrigin = string.IsNullOrEmpty(hour?.WindOrigin) ? null : hour.WindOrigin;
        return new
        {
            spotId = item.Id,
            spotName = item.Location,
            isOwner = ownerSpotIds is not null && ownerSpotIds.Contains(item.Id),
            visibility = visibilities is not null && visibilities.TryGetValue(item.Id, out var visibilityValue) ? visibilityValue : "official",
            score = Available(score),
            classification = Available(classification),
            bestHours = Available(bestHours.Select(best => best.Time).ToArray()),
            bestHourWindows = Available(bestHours.Select(best => ForecastHourWindowDto.Create(best, paid)).ToArray()),
            selectableHourWindows = includeSelectableHours && PlanRules.CanSelectAnyHour(bestHoursMode)
                ? Available(item.Hours.Where(candidate => candidate.Score is not null).Select(candidate => ForecastHourWindowDto.Create(candidate, paid)).ToArray())
                : null,
            metricsHour = hour?.Time,
            windOrigin,
            highlights,
            wind = Available(hour?.WindSpeedKmh is not double windSpeed ? "n/d" : $"{ForecastHourWindowDto.FormatPt(windSpeed, "0.#")} km/h {hour.WindDirection}"),
            gusts = Available(hour?.WindGustKmh is not double windGust ? "n/d" : ForecastHourWindowDto.FormatMeasure(windGust, "0.#", "km/h")),
            waves = paid ? Available(hour?.WaveMeters is not double waveMeters ? "n/d" : ForecastHourWindowDto.FormatMeasure(waveMeters, "0.00", "m")) : Locked(),
            waveDirection = string.IsNullOrEmpty(hour?.WaveDirection) ? null : hour.WaveDirection,
            wavePeriod = paid ? Available(hour?.WavePeriodSeconds is not double wavePeriod ? "n/d" : ForecastHourWindowDto.FormatMeasure(wavePeriod, "0.#", "s")) : Locked(),
            swell = paid ? Available(hour is null ? "n/d" : ForecastHourWindowDto.FormatMeasure(hour.SwellMeters, "0.00", "m")) : Locked(),
            rain = Available(hour?.RainMm is not double rainMm || hour.RainProbability is not int rainProbability ? "n/d" : $"{ForecastHourWindowDto.FormatPt(rainMm, "0.#")} mm ({rainProbability}%)"),
            airTemperature = Available(hour is null ? "n/d" : ForecastHourWindowDto.FormatMeasure(hour.AirTemperatureC, "0.#", "°C")),
            waterTemperature = paid ? Available(hour is null ? "n/d" : ForecastHourWindowDto.FormatMeasure(hour.WaterTemperatureC, "0.#", "°C")) : Locked(),
            pressure = paid ? Available(hour is null ? "n/d" : ForecastHourWindowDto.FormatMeasure(hour.PressureHpa, "0", "hPa")) : Locked(),
            quality
        };
    }
}

internal sealed record FishingForecastQualityDto(
    FishingForecastDataCompletenessDto DataCompleteness,
    FishingForecastConfidenceDto Confidence,
    DateTimeOffset DataUpdatedAt,
    DateTimeOffset EvaluatedAt)
{
    public static FishingForecastQualityDto? Create(
        FishingLocationForecast forecast,
        ForecastSnapshotMetadata snapshot,
        TimeSpan refreshAfter,
        TimeSpan maxStale,
        DateTimeOffset evaluatedAt)
    {
        var confidence = ForecastConfidence.Evaluate(
            forecast,
            snapshot.CreatedAt,
            snapshot.ExpiresAt,
            refreshAfter,
            maxStale,
            evaluatedAt);
        if (confidence is null)
            return null;

        var completeness = ScoringDataCompleteness.FromForecast(forecast);
        return new FishingForecastQualityDto(
            new FishingForecastDataCompletenessDto(
                completeness.ValidHours,
                completeness.ExpectedHours,
                completeness.Ratio),
            new FishingForecastConfidenceDto(
                confidence.Level.ToString().ToLowerInvariant(),
                confidence.Reasons),
            snapshot.CreatedAt,
            evaluatedAt);
    }
}

internal sealed record FishingForecastDataCompletenessDto(
    int ValidHours,
    int ExpectedHours,
    double Ratio);

internal sealed record FishingForecastConfidenceDto(
    string Level,
    IReadOnlyList<string> Reasons);
