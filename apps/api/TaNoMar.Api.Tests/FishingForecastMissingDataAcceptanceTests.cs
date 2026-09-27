using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class FishingForecastMissingDataAcceptanceTests
{
    [Fact]
    public void New_forecast_uses_current_data_quality_version()
    {
        string[] times = ["2026-09-27T06:00", "2026-09-27T07:00", "2026-09-27T08:00"];

        var forecast = FishingForecastService.BuildForecast(
            Location(), Date(), Weather(times), Gfs(times), Marine(times));

        Assert.Equal(FishingForecastDataQuality.CurrentVersion, forecast.DataQualityVersion);
        Assert.NotNull(forecast.Score);
        Assert.Equal(3, forecast.BestHours.Count);
    }

    [Fact]
    public void Missing_wind_speed_makes_score_unavailable()
        => AssertUnavailable(Build((weather, _, _) => weather.Hourly.WindSpeed.Clear()), "wind_speed_missing");

    [Fact]
    public void Missing_wind_direction_makes_score_unavailable()
        => AssertUnavailable(Build((weather, _, _) => weather.Hourly.WindDirection.Clear()), "wind_direction_missing");

    [Fact]
    public void Missing_wind_gust_makes_score_unavailable()
        => AssertUnavailable(Build((weather, _, _) => weather.Hourly.WindGusts.Clear()), "wind_gust_missing");

    [Fact]
    public void Missing_wave_height_makes_score_unavailable()
        => AssertUnavailable(Build((_, _, marine) => marine.Hourly.WaveHeight.Clear()), "wave_height_missing");

    [Fact]
    public void Missing_wave_period_makes_score_unavailable()
        => AssertUnavailable(Build((_, _, marine) => marine.Hourly.WavePeriod.Clear()), "wave_period_missing");

    [Fact]
    public void Missing_weather_rain_probability_makes_score_unavailable()
        => AssertUnavailable(Build((weather, _, _) => weather.Hourly.PrecipitationProbability.Clear()), "weather_rain_probability_missing");

    [Fact]
    public void Missing_gfs_rain_probability_makes_score_unavailable()
        => AssertUnavailable(Build((_, gfs, _) => gfs.Hourly.PrecipitationProbability.Clear()), "gfs_rain_probability_missing");

    [Fact]
    public void Missing_weather_rain_amount_makes_score_unavailable()
        => AssertUnavailable(Build((weather, _, _) => weather.Hourly.Precipitation.Clear()), "weather_rain_amount_missing");

    [Fact]
    public void Missing_gfs_rain_amount_makes_score_unavailable()
        => AssertUnavailable(Build((_, gfs, _) => gfs.Hourly.Precipitation.Clear()), "gfs_rain_amount_missing");

    [Fact]
    public void Multiple_missing_fields_make_score_unavailable()
    {
        var hour = Build((weather, _, marine) =>
        {
            weather.Hourly.WindSpeed.Clear();
            weather.Hourly.WindGusts.Clear();
            marine.Hourly.WavePeriod.Clear();
        });

        AssertUnavailable(hour, "wind_speed_missing", "wind_gust_missing", "wave_period_missing");
        var reasons = Assert.IsAssignableFrom<IReadOnlyList<string>>(hour.ScoreMissingReasons);
        Assert.Equal(reasons.Distinct(StringComparer.Ordinal).Count(), reasons.Count);
    }

    [Fact]
    public void Null_source_element_makes_score_unavailable()
        => AssertUnavailable(Build((weather, _, _) => weather.Hourly.WindSpeed[0] = null), "wind_speed_missing");

    [Fact]
    public void Missing_field_or_list_makes_score_unavailable()
        => AssertUnavailable(Build((_, gfs, _) => gfs.Hourly.PrecipitationProbability.Clear()), "gfs_rain_probability_missing");

    [Fact]
    public void Short_source_list_makes_score_unavailable()
    {
        var weather = Weather(["2026-09-27T05:00", "2026-09-27T06:00"]);
        weather.Hourly.WindSpeed.RemoveAt(1);
        var forecast = FishingForecastService.BuildForecast(Location(), Date(), weather, Gfs(weather.Hourly.Time), Marine(weather.Hourly.Time));

        AssertUnavailable(forecast.Hours.Single(hour => hour.Time == "06:00"), "wind_speed_missing");
    }

    [Fact]
    public void Unmatched_gfs_timestamp_makes_score_unavailable()
        => AssertUnavailable(
            Build((_, gfs, _) => gfs.Hourly.Time[0] = "2026-09-27T07:00"),
            "gfs_timeline_mismatch",
            "gfs_rain_probability_missing",
            "gfs_rain_amount_missing");

    [Fact]
    public void Unmatched_marine_timestamp_makes_score_unavailable()
        => AssertUnavailable(
            Build((_, _, marine) => marine.Hourly.Time[0] = "2026-09-27T07:00"),
            "marine_timeline_mismatch",
            "wave_height_missing",
            "wave_period_missing");

    [Fact]
    public void Known_bug_89_must_become_unavailable()
    {
        var hour = Build((weather, gfs, marine) =>
        {
            weather.Hourly.WindSpeed.Clear();
            weather.Hourly.WindDirection.Clear();
            weather.Hourly.WindGusts.Clear();
            weather.Hourly.Precipitation.Clear();
            weather.Hourly.PrecipitationProbability.Clear();
            gfs.Hourly.Precipitation.Clear();
            gfs.Hourly.PrecipitationProbability.Clear();
            marine.Hourly.WaveHeight.Clear();
            marine.Hourly.WavePeriod.Clear();
        });

        Assert.Null(hour.Score);
        Assert.Equal(FishingScoreAvailability.Unavailable, hour.ScoreAvailability);
        Assert.NotEmpty(hour.ScoreMissingReasons!);
    }

    private static FishingHourForecast Build(Action<OpenMeteoResponse, OpenMeteoResponse, OpenMeteoResponse> mutate)
    {
        string[] times = ["2026-09-27T06:00"];
        var weather = Weather(times);
        var gfs = Gfs(times);
        var marine = Marine(times);
        mutate(weather, gfs, marine);
        return Assert.Single(FishingForecastService.BuildForecast(Location(), Date(), weather, gfs, marine).Hours);
    }

    private static void AssertUnavailable(FishingHourForecast hour, params string[] reasons)
    {
        Assert.Null(hour.Score);
        Assert.Equal(FishingScoreAvailability.Unavailable, hour.ScoreAvailability);
        foreach (var reason in reasons)
            Assert.Contains(reason, hour.ScoreMissingReasons!);
    }

    private static FishingLocation Location() => new()
    {
        Id = "missing-data",
        Name = "Missing Data",
        SeaOrientationDegrees = 180,
        Profile = "praia_aberta"
    };

    private static DateOnly Date() => new(2026, 9, 27);

    private static OpenMeteoResponse Weather(IReadOnlyList<string> times) => new()
    {
        Hourly = new OpenMeteoHourly
        {
            Time = times.ToList(),
            WindSpeed = Values(8, times.Count),
            WindDirection = Values(0, times.Count),
            WindGusts = Values(0, times.Count),
            Precipitation = Values(0, times.Count),
            PrecipitationProbability = Values(0, times.Count),
            Temperature = Values(20, times.Count),
            PressureMsl = Values(1012, times.Count)
        }
    };

    private static OpenMeteoResponse Gfs(IReadOnlyList<string> times) => new()
    {
        Hourly = new OpenMeteoHourly
        {
            Time = times.ToList(),
            Precipitation = Values(0, times.Count),
            PrecipitationProbability = Values(0, times.Count)
        }
    };

    private static OpenMeteoResponse Marine(IReadOnlyList<string> times) => new()
    {
        Hourly = new OpenMeteoHourly
        {
            Time = times.ToList(),
            WaveHeight = Values(0.8, times.Count),
            WaveDirection = Values(90, times.Count),
            WavePeriod = Values(8, times.Count),
            SwellHeight = Values(0.5, times.Count),
            SwellDirection = Values(90, times.Count),
            SwellPeriod = Values(7, times.Count),
            WaterTemperature = Values(18, times.Count)
        }
    };

    private static List<double?> Values(double value, int count)
        => Enumerable.Repeat<double?>(value, count).ToList();
}
