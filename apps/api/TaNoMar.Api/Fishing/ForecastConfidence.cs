namespace TaNoMar.Api.Fishing;

public enum ForecastConfidenceLevel
{
    Low,
    Medium,
    High
}

public static class ForecastConfidenceReasonCodes
{
    public const string LimitedHourCoverage = "limited_hour_coverage";
    public const string SparseHourCoverage = "sparse_hour_coverage";
    public const string SnapshotRefreshDue = "snapshot_refresh_due";
    public const string StaleSnapshot = "stale_snapshot";
}

public sealed record ForecastConfidence(
    ForecastConfidenceLevel Level,
    ForecastConfidenceLevel CoverageLevel,
    ForecastConfidenceLevel FreshnessLevel,
    IReadOnlyList<string> Reasons,
    DateTimeOffset EvaluatedAt)
{
    public static ForecastConfidence? Evaluate(
        FishingLocationForecast forecast,
        DateTimeOffset createdAt,
        DateTimeOffset expiresAt,
        TimeSpan refreshAfter,
        TimeSpan maxStale,
        DateTimeOffset now)
    {
        if (!FishingForecastDataQuality.IsCurrent(forecast)
            || !FishingForecastAvailability.IsDailyScoreAvailable(forecast)
            || createdAt + maxStale <= now)
        {
            return null;
        }

        var completeness = ScoringDataCompleteness.FromForecast(forecast);
        var coverageLevel = CoverageLevelFor(completeness.ValidHours);
        if (coverageLevel is null)
            return null;

        var freshnessLevel = expiresAt <= now
            ? ForecastConfidenceLevel.Low
            : now - createdAt >= refreshAfter
                ? ForecastConfidenceLevel.Medium
                : ForecastConfidenceLevel.High;
        var reasons = new List<string>(2);

        if (coverageLevel == ForecastConfidenceLevel.Medium)
            reasons.Add(ForecastConfidenceReasonCodes.LimitedHourCoverage);
        else if (coverageLevel == ForecastConfidenceLevel.Low)
            reasons.Add(ForecastConfidenceReasonCodes.SparseHourCoverage);

        if (freshnessLevel == ForecastConfidenceLevel.Medium)
            reasons.Add(ForecastConfidenceReasonCodes.SnapshotRefreshDue);
        else if (freshnessLevel == ForecastConfidenceLevel.Low)
            reasons.Add(ForecastConfidenceReasonCodes.StaleSnapshot);

        return new ForecastConfidence(
            WorseOf(coverageLevel.Value, freshnessLevel),
            coverageLevel.Value,
            freshnessLevel,
            reasons,
            now);
    }

    private static ForecastConfidenceLevel? CoverageLevelFor(int validHours) => validHours switch
    {
        >= 12 => ForecastConfidenceLevel.High,
        >= 8 => ForecastConfidenceLevel.Medium,
        >= 3 => ForecastConfidenceLevel.Low,
        _ => null
    };

    private static ForecastConfidenceLevel WorseOf(
        ForecastConfidenceLevel coverage,
        ForecastConfidenceLevel freshness)
        => (ForecastConfidenceLevel)Math.Min((int)coverage, (int)freshness);
}
