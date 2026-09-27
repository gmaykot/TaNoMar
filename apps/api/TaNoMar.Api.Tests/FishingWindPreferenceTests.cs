using TaNoMar.Api.Data;
using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class FishingWindPreferenceTests
{
    [Fact]
    public void Apply_UsesChosenDirectionAndKeepsGeographicOrigin()
    {
        var forecast = Forecast(
            Hour("06:00", "Leste"),
            Hour("07:00", "Oeste"),
            Hour("08:00", "Norte"));

        var east = FishingWindPreference.Apply(forecast, 90, 90, "praia_aberta");
        var west = FishingWindPreference.Apply(forecast, 270, 90, "praia_aberta");

        Assert.Equal("06:00", east.BestHour?.Time);
        Assert.Equal("07:00", west.BestHour?.Time);
        Assert.Equal("mar", east.Hours.Single(item => item.Time == "06:00").WindOrigin);
    }

    [Fact]
    public void Apply_does_not_resurrect_an_unavailable_hour()
    {
        var unavailable = Hour("06:00", "Leste") with
        {
            Score = null,
            WindSpeedKmh = null,
            ScoreAvailability = FishingScoreAvailability.Unavailable,
            ScoreMissingReasons = ["wind_speed_missing"]
        };
        var forecast = Forecast(unavailable, Hour("07:00", "Oeste"));

        var result = FishingWindPreference.Apply(forecast, 90, 90, "praia_aberta");
        var preserved = result.Hours.Single(item => item.Time == "06:00");

        Assert.Null(preserved.Score);
        Assert.Equal(FishingScoreAvailability.Unavailable, preserved.ScoreAvailability);
        Assert.Contains("wind_speed_missing", preserved.ScoreMissingReasons!);
        Assert.DoesNotContain(result.BestHours, item => item.Time == "06:00");
    }

    [Fact]
    public void Apply_makes_daily_score_unavailable_with_fewer_than_three_valid_hours()
    {
        var forecast = Forecast(Hour("06:00", "Leste"), Hour("07:00", "Oeste"));

        var result = FishingWindPreference.Apply(forecast, 90, 90, "praia_aberta");

        Assert.Null(result.Score);
        Assert.Empty(result.BestHours);
        Assert.Null(result.BestHour);
        Assert.Equal(2, result.Hours.Count);
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData(0, true)]
    [InlineData(315, true)]
    [InlineData(46, false)]
    [InlineData(360, false)]
    public void IdealWindDirection_OnlyAcceptsCompassOptions(int? degrees, bool expected)
    {
        Assert.Equal(expected, SpotRules.IsValidIdealWindDirection(degrees));
    }

    private static FishingLocationForecast Forecast(params FishingHourForecast[] hours) => new(
        "local",
        "Local",
        new DateOnly(2026, 9, 9),
        0,
        hours,
        hours.FirstOrDefault(),
        hours);

    private static FishingHourForecast Hour(string time, string direction) => new(
        Time: time,
        Score: 0,
        WindSpeedKmh: 8,
        WindGustKmh: 10,
        WindDirection: direction,
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
