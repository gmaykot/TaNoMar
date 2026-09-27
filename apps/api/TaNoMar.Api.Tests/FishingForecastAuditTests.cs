using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class FishingForecastAuditTests
{
    private static readonly DateTimeOffset SnapshotCreatedAt = new(2026, 9, 27, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Passes_a_consistent_normalized_forecast_and_marks_raw_source_as_unavailable()
    {
        var location = Location();
        var hours = new[]
        {
            Hour("04:00", 4.0),
            Hour("05:00", 8.1),
            Hour("06:00", 9.0),
            Hour("20:00", 7.0),
        };
        var forecast = new FishingLocationForecast(
            location.Id,
            location.Name,
            new DateOnly(2026, 9, 8),
            8.0,
            [hours[2], hours[1], hours[3]],
            hours[2],
            hours,
            DataQualityVersion: FishingForecastDataQuality.CurrentVersion);

        var report = FishingForecastAudit.Run(location, forecast);

        Assert.True(report.Passed);
        Assert.False(report.RawSourceComparisonAvailable);
        Assert.Empty(report.Findings);
        Assert.Equal(4, report.HourCount);
        Assert.Equal(3, report.BestHourCount);
        Assert.Equal(4, report.Hours.Count);
        Assert.True(report.Hours.Single(item => item.Time == "06:00").IsBestHour);
        Assert.Equal(FishingForecastDataQuality.CurrentVersion, report.DataQualityVersion);
        Assert.Equal("Current", report.QualityState);
    }

    [Theory]
    [InlineData(null, "Legacy")]
    [InlineData(0, "Legacy")]
    [InlineData(999, "Incompatible")]
    public void Reports_snapshot_data_quality_state(int? version, string expectedState)
    {
        var location = Location();
        var forecast = new FishingLocationForecast(
            location.Id, location.Name, new DateOnly(2026, 9, 8), null, [], null, [],
            DataQualityVersion: version);

        var report = FishingForecastAudit.Run(location, forecast);

        Assert.Equal(version, report.DataQualityVersion);
        Assert.Equal(expectedState, report.QualityState);
        Assert.False(report.Passed);
        Assert.Contains(report.Findings, finding => finding.Path == "dataQualityVersion");
    }

    [Fact]
    public void Reports_duplicate_hours_invalid_ranges_and_wrong_best_hours()
    {
        var location = Location();
        var hours = new[]
        {
            Hour("05:00", 8.0),
            Hour("05:00", 7.0) with { RainProbability = 120, WaveMeters = -0.1 },
        };
        var forecast = new FishingLocationForecast(
            location.Id,
            location.Name,
            new DateOnly(2026, 9, 8),
            8.0,
            [hours[1]],
            hours[1],
            hours,
            DataQualityVersion: FishingForecastDataQuality.CurrentVersion);

        var report = FishingForecastAudit.Run(location, forecast);

        Assert.False(report.Passed);
        Assert.Contains(report.Findings, finding => finding.Path == "hours[05:00].time");
        Assert.Contains(report.Findings, finding => finding.Path == "hours[05:00].rainProbability");
        Assert.Contains(report.Findings, finding => finding.Path == "hours[05:00]");
        Assert.Contains(report.Findings, finding => finding.Path == "bestHours");
    }

    [Fact]
    public void Compares_normalized_values_with_the_three_external_sources()
    {
        var location = Location();
        var hours = new[] { Hour("05:00", 7.8), Hour("06:00", 7.8), Hour("07:00", 7.8) };
        var forecast = new FishingLocationForecast(
            location.Id,
            location.Name,
            new DateOnly(2026, 9, 8),
            7.8,
            hours,
            hours[0],
            hours,
            DataQualityVersion: FishingForecastDataQuality.CurrentVersion);
        var weather = new OpenMeteoResponse
        {
            Hourly = new OpenMeteoHourly
            {
                Time = ["2026-09-08T05:00", "2026-09-08T06:00", "2026-09-08T07:00"],
                WindSpeed = [8, 8, 8],
                WindGusts = [12, 12, 12],
                WindDirection = [90, 90, 90],
                Precipitation = [0, 0, 0],
                PrecipitationProbability = [10, 10, 10],
                Temperature = [20, 20, 20],
                PressureMsl = [1012, 1012, 1012]
            }
        };
        var gfsRain = new OpenMeteoResponse
        {
            Hourly = new OpenMeteoHourly
            {
                Time = ["2026-09-08T05:00", "2026-09-08T06:00", "2026-09-08T07:00"],
                Precipitation = [0, 0, 0],
                PrecipitationProbability = [8, 8, 8]
            }
        };
        var marine = new OpenMeteoResponse
        {
            Hourly = new OpenMeteoHourly
            {
                Time = ["2026-09-08T05:00", "2026-09-08T06:00", "2026-09-08T07:00"],
                WaveHeight = [0.8, 0.8, 0.8],
                WaveDirection = [90, 90, 90],
                WavePeriod = [8, 8, 8],
                SwellHeight = [0.5, 0.5, 0.5],
                SwellDirection = [90, 90, 90],
                SwellPeriod = [7, 7, 7],
                WaterTemperature = [18, 18, 18]
            }
        };

        var report = FishingForecastAudit.Run(
            location,
            forecast,
            new FishingForecastAuditSources(weather, gfsRain, marine));

        Assert.True(report.Passed);
        Assert.True(report.RawSourceComparisonAvailable);
        Assert.Empty(report.Findings);
        var source = report.Hours.Single(item => item.Time == "05:00").Sources!;
        Assert.Equal(7.8, source.CalculatedScore);
        Assert.Equal(8, source.Weather.WindSpeedKmh);
        Assert.Equal(0.8, source.Marine.WaveMeters);
    }

    [Theory]
    [InlineData(16, 1, "High", "High", 1.0)]
    [InlineData(16, 4, "Medium", "Medium", 1.0)]
    [InlineData(16, 8, "Low", "Low", 1.0)]
    [InlineData(10, 1, "High", "Medium", 0.625)]
    [InlineData(4, 8, "Low", "Low", 0.25)]
    public void Snapshot_quality_audit_uses_real_metadata_and_completeness(
        int validHours,
        int ageHours,
        string expectedFreshness,
        string expectedConfidence,
        double expectedRatio)
    {
        var forecast = ForecastWithHours(validHours);
        var now = SnapshotCreatedAt.AddHours(ageHours);

        var quality = FishingForecastAudit.SnapshotQuality(
            forecast,
            SnapshotCreatedAt,
            SnapshotCreatedAt.AddHours(6),
            TimeSpan.FromHours(3),
            TimeSpan.FromHours(12),
            now);

        Assert.Equal(FishingForecastDataQuality.CurrentVersion, quality.DataQualityVersion);
        Assert.Equal("Current", quality.QualityState);
        Assert.Equal(SnapshotCreatedAt, quality.SnapshotCreatedAt);
        Assert.Equal(SnapshotCreatedAt.AddHours(6), quality.SnapshotExpiresAt);
        Assert.Equal(TimeSpan.FromHours(ageHours), quality.SnapshotAge);
        Assert.Equal(expectedFreshness, quality.FreshnessLevel);
        Assert.Equal(validHours, quality.ValidHours);
        Assert.Equal(16, quality.ExpectedHours);
        Assert.Equal(expectedRatio, quality.DataCompletenessRatio);
        Assert.Equal(expectedConfidence, quality.Confidence);
        if (validHours is >= 8 and <= 11)
            Assert.Contains(ForecastConfidenceReasonCodes.LimitedHourCoverage, quality.ConfidenceReasons);
        if (validHours is >= 3 and <= 7)
            Assert.Contains(ForecastConfidenceReasonCodes.SparseHourCoverage, quality.ConfidenceReasons);
        if (ageHours is >= 3 and < 6)
            Assert.Contains(ForecastConfidenceReasonCodes.SnapshotRefreshDue, quality.ConfidenceReasons);
        if (ageHours >= 6)
            Assert.Contains(ForecastConfidenceReasonCodes.StaleSnapshot, quality.ConfidenceReasons);
    }

    [Theory]
    [InlineData(null, "Legacy")]
    [InlineData(999, "Incompatible")]
    public void Snapshot_quality_audit_does_not_assign_confidence_to_non_current_data(
        int? version,
        string expectedState)
    {
        var forecast = ForecastWithHours(16) with { DataQualityVersion = version };

        var quality = FishingForecastAudit.SnapshotQuality(
            forecast,
            SnapshotCreatedAt,
            SnapshotCreatedAt.AddHours(6),
            TimeSpan.FromHours(3),
            TimeSpan.FromHours(12),
            SnapshotCreatedAt.AddHours(1));

        Assert.Equal(expectedState, quality.QualityState);
        Assert.Null(quality.FreshnessLevel);
        Assert.Null(quality.Confidence);
        Assert.Empty(quality.ConfidenceReasons);
        Assert.Equal(16, quality.ValidHours);
    }

    private static FishingLocation Location() => new()
    {
        Id = "praia-teste",
        Name = "Praia de teste",
        Latitude = -27.7,
        Longitude = -48.5,
        SeaOrientationDegrees = 90,
        Profile = "praia_aberta"
    };

    private static FishingLocationForecast ForecastWithHours(int validHours)
    {
        var hours = Enumerable.Range(0, validHours)
            .Select(index => Hour($"{index + 5:00}:00", 8))
            .ToArray();
        var bestHours = hours.Take(3).ToArray();
        return new FishingLocationForecast(
            "audit-quality",
            "Audit quality",
            new DateOnly(2026, 9, 27),
            validHours >= 3 ? 8 : null,
            validHours >= 3 ? bestHours : [],
            validHours >= 3 ? bestHours.FirstOrDefault() : null,
            hours,
            DataQualityVersion: FishingForecastDataQuality.CurrentVersion);
    }

    private static FishingHourForecast Hour(string time, double score) => new(
        time,
        score,
        8,
        12,
        "Leste",
        0,
        20,
        18,
        10,
        10,
        8,
        0.8,
        8,
        0.5,
        7,
        "Leste",
        "Leste",
        0.2,
        1012,
        "terra");
}
