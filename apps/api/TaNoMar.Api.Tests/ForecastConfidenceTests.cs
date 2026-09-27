using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class ForecastConfidenceTests
{
    private static readonly DateTimeOffset CreatedAt = new(2026, 9, 27, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset ExpiresAt = CreatedAt.AddHours(6);
    private static readonly TimeSpan RefreshAfter = TimeSpan.FromHours(3);
    private static readonly TimeSpan MaxStale = TimeSpan.FromHours(12);

    [Theory]
    [InlineData(16, ForecastConfidenceLevel.High)]
    [InlineData(12, ForecastConfidenceLevel.High)]
    [InlineData(11, ForecastConfidenceLevel.Medium)]
    [InlineData(8, ForecastConfidenceLevel.Medium)]
    [InlineData(7, ForecastConfidenceLevel.Low)]
    [InlineData(3, ForecastConfidenceLevel.Low)]
    public void Classifies_coverage_from_scoring_data_completeness(
        int validHours,
        ForecastConfidenceLevel expected)
    {
        var confidence = Evaluate(Forecast(validHours), CreatedAt.AddHours(1));

        Assert.NotNull(confidence);
        Assert.Equal(expected, confidence.CoverageLevel);
    }

    [Fact]
    public void Two_valid_hours_do_not_produce_confidence()
    {
        var confidence = Evaluate(Forecast(2), CreatedAt.AddHours(1));

        Assert.Null(confidence);
    }

    [Fact]
    public void Unavailable_daily_score_does_not_produce_confidence()
    {
        var forecast = Forecast(16) with { Score = null, BestHours = [], BestHour = null };

        var confidence = Evaluate(forecast, CreatedAt.AddHours(1));

        Assert.Null(confidence);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(0)]
    [InlineData(999)]
    public void Non_current_data_quality_does_not_produce_confidence(int? version)
    {
        var forecast = Forecast(16) with { DataQualityVersion = version };

        var confidence = Evaluate(forecast, CreatedAt.AddHours(1));

        Assert.Null(confidence);
    }

    [Fact]
    public void Before_refresh_after_is_freshness_high()
    {
        var now = CreatedAt + RefreshAfter - TimeSpan.FromTicks(1);

        var confidence = Evaluate(Forecast(16), now);

        Assert.Equal(ForecastConfidenceLevel.High, confidence?.FreshnessLevel);
    }

    [Fact]
    public void Exactly_at_refresh_after_is_freshness_medium_like_cache_stale_semantics()
    {
        var forecast = Forecast(16);
        var now = CreatedAt + RefreshAfter;
        var cached = new CachedForecast(forecast, CreatedAt, ExpiresAt);

        var confidence = Evaluate(forecast, now);

        Assert.True(cached.IsStale(RefreshAfter, now));
        Assert.Equal(ForecastConfidenceLevel.Medium, confidence?.FreshnessLevel);
    }

    [Theory]
    [InlineData(4)]
    [InlineData(5)]
    public void Between_refresh_after_and_expiration_is_freshness_medium(int ageHours)
    {
        var confidence = Evaluate(Forecast(16), CreatedAt.AddHours(ageHours));

        Assert.Equal(ForecastConfidenceLevel.Medium, confidence?.FreshnessLevel);
    }

    [Fact]
    public void Immediately_before_expiration_is_freshness_medium()
    {
        var confidence = Evaluate(Forecast(16), ExpiresAt - TimeSpan.FromTicks(1));

        Assert.Equal(ForecastConfidenceLevel.Medium, confidence?.FreshnessLevel);
    }

    [Fact]
    public void Exactly_at_expiration_is_freshness_low_when_max_stale_allows()
    {
        var forecast = Forecast(16);
        var cached = new CachedForecast(forecast, CreatedAt, ExpiresAt);

        var confidence = Evaluate(forecast, ExpiresAt);

        Assert.False(cached.IsUsable(ExpiresAt));
        Assert.True(cached.IsAvailable(MaxStale, ExpiresAt));
        Assert.Equal(ForecastConfidenceLevel.Low, confidence?.FreshnessLevel);
    }

    [Fact]
    public void Inside_stale_window_is_freshness_low()
    {
        var confidence = Evaluate(Forecast(16), CreatedAt.AddHours(8));

        Assert.Equal(ForecastConfidenceLevel.Low, confidence?.FreshnessLevel);
    }

    [Fact]
    public void Exactly_at_max_stale_limit_is_not_available_like_cache_semantics()
    {
        var forecast = Forecast(16);
        var now = CreatedAt + MaxStale;
        var cached = new CachedForecast(forecast, CreatedAt, ExpiresAt);

        var confidence = Evaluate(forecast, now);

        Assert.False(cached.IsAvailable(MaxStale, now));
        Assert.Null(confidence);
    }

    [Fact]
    public void Outside_max_stale_does_not_produce_confidence()
    {
        var confidence = Evaluate(Forecast(16), CreatedAt + MaxStale + TimeSpan.FromTicks(1));

        Assert.Null(confidence);
    }

    [Theory]
    [InlineData(16, 1, ForecastConfidenceLevel.High)]
    [InlineData(16, 4, ForecastConfidenceLevel.Medium)]
    [InlineData(10, 1, ForecastConfidenceLevel.Medium)]
    [InlineData(10, 4, ForecastConfidenceLevel.Medium)]
    [InlineData(4, 1, ForecastConfidenceLevel.Low)]
    [InlineData(16, 8, ForecastConfidenceLevel.Low)]
    [InlineData(10, 8, ForecastConfidenceLevel.Low)]
    [InlineData(4, 8, ForecastConfidenceLevel.Low)]
    public void Final_level_is_the_worse_of_coverage_and_freshness(
        int validHours,
        int ageHours,
        ForecastConfidenceLevel expected)
    {
        var confidence = Evaluate(Forecast(validHours), CreatedAt.AddHours(ageHours));

        Assert.Equal(expected, confidence?.Level);
    }

    [Theory]
    [MemberData(nameof(ReasonCases))]
    public void Reasons_are_complete_and_deterministic(
        int validHours,
        int ageHours,
        string[] expectedReasons)
    {
        var confidence = Evaluate(Forecast(validHours), CreatedAt.AddHours(ageHours));

        Assert.NotNull(confidence);
        Assert.Equal(expectedReasons, confidence.Reasons);
    }

    public static TheoryData<int, int, string[]> ReasonCases => new()
    {
        { 16, 1, [] },
        { 10, 1, [ForecastConfidenceReasonCodes.LimitedHourCoverage] },
        { 4, 1, [ForecastConfidenceReasonCodes.SparseHourCoverage] },
        { 16, 4, [ForecastConfidenceReasonCodes.SnapshotRefreshDue] },
        { 16, 8, [ForecastConfidenceReasonCodes.StaleSnapshot] },
        { 10, 4, [ForecastConfidenceReasonCodes.LimitedHourCoverage, ForecastConfidenceReasonCodes.SnapshotRefreshDue] },
        { 4, 8, [ForecastConfidenceReasonCodes.SparseHourCoverage, ForecastConfidenceReasonCodes.StaleSnapshot] }
    };

    [Fact]
    public void Confidence_is_independent_from_score_value()
    {
        var highScoreLowCoverage = Evaluate(Forecast(4, 9.5), CreatedAt.AddHours(1));
        var lowScoreFullCoverage = Evaluate(Forecast(16, 1.0), CreatedAt.AddHours(1));
        var zeroScoreFullCoverage = Evaluate(Forecast(16, 0), CreatedAt.AddHours(1));

        Assert.Equal(ForecastConfidenceLevel.Low, highScoreLowCoverage?.Level);
        Assert.Equal(ForecastConfidenceLevel.High, lowScoreFullCoverage?.Level);
        Assert.Equal(ForecastConfidenceLevel.High, zeroScoreFullCoverage?.Level);
    }

    [Fact]
    public void Wind_preference_does_not_change_completeness_or_confidence()
    {
        var forecast = Forecast(16, 8);
        var personalized = FishingWindPreference.Apply(forecast, 270, 90, "praia_aberta");

        var originalCompleteness = ScoringDataCompleteness.FromForecast(forecast);
        var personalizedCompleteness = ScoringDataCompleteness.FromForecast(personalized);
        var originalConfidence = Evaluate(forecast, CreatedAt.AddHours(1));
        var personalizedConfidence = Evaluate(personalized, CreatedAt.AddHours(1));

        Assert.Equal(originalCompleteness, personalizedCompleteness);
        Assert.Equal(originalConfidence?.Level, personalizedConfidence?.Level);
        Assert.Equal(originalConfidence?.CoverageLevel, personalizedConfidence?.CoverageLevel);
        Assert.Equal(originalConfidence?.FreshnessLevel, personalizedConfidence?.FreshnessLevel);
        Assert.Equal(originalConfidence?.Reasons, personalizedConfidence?.Reasons);
    }

    private static ForecastConfidence? Evaluate(FishingLocationForecast forecast, DateTimeOffset now)
        => ForecastConfidence.Evaluate(
            forecast,
            CreatedAt,
            ExpiresAt,
            RefreshAfter,
            MaxStale,
            now);

    private static FishingLocationForecast Forecast(int validHours, double score = 8)
    {
        var hours = Enumerable.Range(0, validHours)
            .Select(index => Hour($"{index + 5:00}:00", score))
            .ToArray();
        var bestHours = validHours >= 3 ? hours.Take(3).ToArray() : [];
        return new FishingLocationForecast(
            "confidence",
            "Confidence",
            new DateOnly(2026, 9, 27),
            validHours >= 3 ? score : null,
            bestHours,
            bestHours.FirstOrDefault(),
            hours,
            DataQualityVersion: FishingForecastDataQuality.CurrentVersion);
    }

    private static FishingHourForecast Hour(string time, double score) => new(
        Time: time,
        Score: score,
        WindSpeedKmh: 8,
        WindGustKmh: 10,
        WindDirection: "Leste",
        RainMm: 0,
        AirTemperatureC: 22,
        WaterTemperatureC: 20,
        RainProbability: 0,
        RainProbabilityBestMatch: 0,
        RainProbabilityGfs: 0,
        WaveMeters: 0.8,
        WavePeriodSeconds: 8,
        SwellMeters: 0.5,
        SwellPeriodSeconds: 8,
        WaveDirection: "Leste",
        SwellDirection: "Leste",
        SeaLevelHeightMsl: null,
        PressureHpa: 1015);
}
