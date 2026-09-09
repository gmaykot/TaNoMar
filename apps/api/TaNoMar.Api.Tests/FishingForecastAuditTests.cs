using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class FishingForecastAuditTests
{
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
            hours);

        var report = FishingForecastAudit.Run(location, forecast);

        Assert.True(report.Passed);
        Assert.False(report.RawSourceComparisonAvailable);
        Assert.Empty(report.Findings);
        Assert.Equal(4, report.HourCount);
        Assert.Equal(3, report.BestHourCount);
        Assert.Equal(4, report.Hours.Count);
        Assert.True(report.Hours.Single(item => item.Time == "06:00").IsBestHour);
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
            hours);

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
        var hour = Hour("05:00", 7.8);
        var forecast = new FishingLocationForecast(
            location.Id,
            location.Name,
            new DateOnly(2026, 9, 8),
            7.8,
            [hour],
            hour,
            [hour]);
        var weather = new OpenMeteoResponse
        {
            Hourly = new OpenMeteoHourly
            {
                Time = ["2026-09-08T05:00"],
                WindSpeed = [8],
                WindGusts = [12],
                WindDirection = [90],
                Precipitation = [0],
                PrecipitationProbability = [10],
                Temperature = [20],
                PressureMsl = [1012]
            }
        };
        var gfsRain = new OpenMeteoResponse
        {
            Hourly = new OpenMeteoHourly
            {
                Time = ["2026-09-08T05:00"],
                Precipitation = [0],
                PrecipitationProbability = [8]
            }
        };
        var marine = new OpenMeteoResponse
        {
            Hourly = new OpenMeteoHourly
            {
                Time = ["2026-09-08T05:00"],
                WaveHeight = [0.8],
                WaveDirection = [90],
                WavePeriod = [8],
                SwellHeight = [0.5],
                SwellDirection = [90],
                SwellPeriod = [7],
                WaterTemperature = [18]
            }
        };

        var report = FishingForecastAudit.Run(
            location,
            forecast,
            new FishingForecastAuditSources(weather, gfsRain, marine));

        Assert.True(report.Passed);
        Assert.True(report.RawSourceComparisonAvailable);
        Assert.Empty(report.Findings);
        var source = report.Hours.Single().Sources!;
        Assert.Equal(7.8, source.CalculatedScore);
        Assert.Equal(8, source.Weather.WindSpeedKmh);
        Assert.Equal(0.8, source.Marine.WaveMeters);
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
