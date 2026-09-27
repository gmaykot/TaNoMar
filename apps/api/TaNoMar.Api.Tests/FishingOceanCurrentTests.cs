using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class FishingOceanCurrentTests
{
    [Fact]
    public void BuildForecast_keeps_current_nullable_and_aligned_to_marine_timeline()
    {
        var location = new FishingLocation
        {
            Id = "spot",
            Name = "Spot",
            Latitude = -27.7,
            Longitude = -48.5,
            SeaOrientationDegrees = 90,
            Profile = "praia_aberta"
        };
        var weather = new OpenMeteoResponse
        {
            Hourly = new OpenMeteoHourly
            {
                Time = ["2026-09-08T05:00", "2026-09-08T06:00", "2026-09-08T07:00"],
                WindSpeed = [8, 8, 8],
                WindGusts = [10, 10, 10],
                WindDirection = [90, 90, 90],
                Precipitation = [0, 0, 0],
                PrecipitationProbability = [10, 10, 10],
                Temperature = [20, 20, 20],
                PressureMsl = [1012, 1012, 1012]
            }
        };
        var gfs = new OpenMeteoResponse
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
                WaterTemperature = [18, 18, 18],
                OceanCurrentVelocity = [1.25, null, 0.75],
                OceanCurrentDirection = [225, null, 180]
            }
        };

        var forecast = FishingForecastService.BuildForecast(
            location,
            new DateOnly(2026, 9, 8),
            weather,
            gfs,
            marine);

        var first = forecast.Hours.Single(hour => hour.Time == "05:00");
        var second = forecast.Hours.Single(hour => hour.Time == "06:00");
        Assert.Equal(1.25, first.OceanCurrentVelocityKmh);
        Assert.Equal(225, first.OceanCurrentDirectionDegrees);
        Assert.Null(second.OceanCurrentVelocityKmh);
        Assert.Null(second.OceanCurrentDirectionDegrees);
        Assert.Equal(7.8, forecast.Score);
    }

    [Fact]
    public void Admin_audit_exposes_current_degrees_and_cardinal_without_changing_score()
    {
        var location = new FishingLocation { Id = "spot", Name = "Spot", Profile = "praia_aberta", SeaOrientationDegrees = 90 };
        var hour = new FishingHourForecast(
            "05:00", 7.8, 8, 12, "Leste", 0, 20, 18, 10, 10, 8,
            0.8, 8, 0.5, 7, "Leste", "Leste", 0.2, 1012, "terra",
            90, 1.25, 225);
        var forecast = new FishingLocationForecast("spot", "Spot", new DateOnly(2026, 9, 8), 7.8, [hour], hour, [hour]);
        var report = FishingForecastAudit.Run(location, forecast);

        var normalized = Assert.Single(report.Hours).Normalized;
        Assert.Equal(1.25, normalized.OceanCurrentVelocityKmh);
        Assert.Equal(225, normalized.OceanCurrentDirectionDegrees);
        Assert.Equal("Sudoeste", normalized.OceanCurrentDirection);
        Assert.Equal(7.8, normalized.Score);
    }
}
