using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class FishingScoreCalculatorTests
{
    [Theory]
    [InlineData(8.0, 9.8)]
    [InlineData(12.0, 9.6)]
    [InlineData(16.0, 9.3)]
    [InlineData(20.0, 8.9)]
    [InlineData(24.0, 8.6)]
    [InlineData(30.0, 8.0)]
    [InlineData(35.0, 7.7)]
    [InlineData(36.0, 7.4)]
    public void Golden_wind_speed_thresholds(double speed, double expected)
        => Assert.Equal(Math.Round(expected, 1, MidpointRounding.ToEven), Calculate(speed: speed));

    [Theory]
    [InlineData(25.0, 9.3)]
    [InlineData(30.0, 8.8)]
    [InlineData(35.0, 8.2)]
    [InlineData(40.0, 7.5)]
    [InlineData(45.0, 6.8)]
    [InlineData(50.0, 5.8)]
    public void Golden_gust_penalty_thresholds(double gust, double expected)
        => Assert.Equal(expected, Calculate(gust: gust));

    [Theory]
    [InlineData(10.0, 9.8)]
    [InlineData(20.0, 9.7)]
    [InlineData(35.0, 9.6)]
    [InlineData(50.0, 9.4)]
    [InlineData(65.0, 9.2)]
    [InlineData(80.0, 9.0)]
    [InlineData(81.0, 8.9)]
    public void Golden_rain_probability_thresholds(double probability, double expected)
        => Assert.Equal(expected, Calculate(rainProbability: probability));

    [Theory]
    [InlineData(0.5, 9.3)]
    [InlineData(2.0, 8.6)]
    [InlineData(4.0, 7.8)]
    [InlineData(8.0, 6.8)]
    public void Golden_rain_amount_thresholds(double rainMm, double expected)
        => Assert.Equal(expected, Calculate(rainMm: rainMm));

    [Theory]
    [InlineData(0.0, 9.4)]
    [InlineData(4.0, 9.5)]
    [InlineData(5.0, 9.6)]
    [InlineData(6.0, 9.8)]
    [InlineData(10.0, 9.8)]
    [InlineData(10.1, 9.6)]
    [InlineData(12.0, 9.6)]
    [InlineData(12.1, 9.4)]
    [InlineData(14.0, 9.4)]
    [InlineData(14.1, 9.2)]
    public void Golden_wave_period_thresholds(double period, double expected)
        => Assert.Equal(expected, Calculate(wavePeriod: period));

    [Fact]
    public void Golden_representative_conditions_are_frozen()
    {
        Assert.Equal(9.8, Calculate()); // excellent
        Assert.Equal(6.4, Calculate(speed: 20, windFrom: 0, waveHeight: 1.8, wavePeriod: 12, rainProbability: 50, hour: 13)); // intermediate
        Assert.Equal(0.0, Calculate(speed: 36, gust: 50, windFrom: 90, waveHeight: 2.6, wavePeriod: 15, rainProbability: 81, rainMm: 8)); // poor
        Assert.Equal(0.0, Calculate(speed: 36, gust: 50, windFrom: 90, waveHeight: 3, wavePeriod: 15, rainProbability: 100, rainMm: 12)); // lower clamp
        var upperBound = Calculate(speed: 0, gust: 0, windFrom: 270, waveHeight: 0.8, wavePeriod: 8, rainProbability: 0, rainMm: 0);
        Assert.Equal(9.8, upperBound);
        Assert.InRange(upperBound, 0, 10); // upper clamp remains enforced
    }

    [Theory]
    [InlineData("praia_aberta", 0.8, 9.8)]
    [InlineData("praia_protegida", 0.8, 9.8)]
    [InlineData("outro", 0.8, 9.7)]
    public void Golden_profiles_are_frozen(string profile, double waveHeight, double expected)
        => Assert.Equal(expected, Calculate(profile: profile, waveHeight: waveHeight));

    [Theory]
    [InlineData("praia_aberta", 0.4, 9.8)]
    [InlineData("praia_aberta", 1.5, 9.5)]
    [InlineData("praia_aberta", 1.8, 9.1)]
    [InlineData("praia_aberta", 2.1, 8.7)]
    [InlineData("praia_aberta", 2.5, 6.8)]
    [InlineData("praia_protegida", 0.2, 9.4)]
    [InlineData("praia_protegida", 0.3, 9.8)]
    [InlineData("praia_protegida", 1.2, 9.5)]
    [InlineData("praia_protegida", 1.8, 8.6)]
    [InlineData("outro", 0.2, 9.3)]
    [InlineData("outro", 0.4, 9.7)]
    [InlineData("outro", 1.9, 8.9)]
    [InlineData("outro", 2.3, 6.9)]
    public void Golden_wave_height_thresholds_are_frozen(string profile, double height, double expected)
        => Assert.Equal(expected, Calculate(profile: profile, waveHeight: height));

    [Theory]
    [InlineData(270.0, 9.8)] // offshore for orientation 90
    [InlineData(90.0, 7.8)] // onshore
    [InlineData(0.0, 8.9)] // lateral/neutral
    public void Golden_wind_orientation_is_frozen(double windFrom, double expected)
        => Assert.Equal(expected, Calculate(windFrom: windFrom));

    [Fact]
    public void Missing_orientation_uses_the_current_neutral_direction_score()
        => Assert.Equal(8.9, Calculate(seaOrientation: null));

    [Theory]
    [InlineData(5, 9.8)]
    [InlineData(9, 9.6)]
    [InlineData(12, 9.5)]
    [InlineData(16, 9.8)]
    [InlineData(20, 9.4)]
    [InlineData(4, 9.4)]
    public void Golden_hour_bands_are_frozen(int hour, double expected)
        => Assert.Equal(expected, Calculate(hour: hour));

    [Theory]
    [InlineData(29, 39, 6.5)]
    [InlineData(30, 39, 6.5)]
    [InlineData(29, 40, 5.8)]
    [InlineData(30, 40, 4.8)]
    public void Combined_wind_and_gust_penalty_requires_both_thresholds(double speed, double gust, double expected)
        => Assert.Equal(expected, Calculate(speed: speed, gust: gust));

    [Fact]
    public void Rounding_is_to_one_decimal_with_to_even()
        => Assert.Equal(8.7, Calculate(speed: 12, windFrom: 0)); // raw value 8.675

    [Fact]
    public void Real_zero_values_are_valid_inputs_not_missing_data()
    {
        var allZero = Calculate(speed: 0, gust: 0, windFrom: 270, waveHeight: 0, wavePeriod: 0, rainProbability: 0, rainMm: 0);
        var zeroRainOnly = Calculate(rainProbability: 0, rainMm: 0);

        Assert.Equal(8.9, allZero);
        Assert.Equal(9.8, zeroRainOnly);
    }

    [Fact]
    public void Evaluate_accepts_real_zero_values_and_preserves_calculate_parity()
    {
        var result = FishingScoreCalculator.Evaluate(0, 0, 270, 90, 0, 0, 0, 0, 0, 0, 6, "praia_aberta");

        Assert.Equal(FishingScoreAvailability.Available, result.Availability);
        Assert.Equal(Calculate(speed: 0, gust: 0, windFrom: 270, waveHeight: 0, wavePeriod: 0, rainProbability: 0, rainMm: 0), result.Score);
        Assert.Empty(result.MissingReasons);
    }

    [Fact]
    public void Evaluate_keeps_missing_sea_orientation_as_neutral_not_unavailable()
    {
        var result = FishingScoreCalculator.Evaluate(8, 0, 270, null, 0.8, 8, 0, 0, 0, 0, 6, "praia_aberta");

        Assert.Equal(FishingScoreAvailability.Available, result.Availability);
        Assert.Equal(Calculate(seaOrientation: null), result.Score);
    }

    [Fact]
    public void Daily_score_uses_only_05_to_20_orders_ties_by_time_and_averages_three()
    {
        var forecast = FishingForecastService.BuildForecast(
            new FishingLocation
            {
                Id = "daily",
                Name = "Daily",
                SeaOrientationDegrees = 90,
                Profile = "praia_aberta"
            },
            new DateOnly(2026, 9, 27),
            CompleteWeather(["04:00", "05:00", "06:00", "16:00", "20:00", "21:00"], [0, 0.5, 0, 0, 0, 0]),
            CompleteRain(["04:00", "05:00", "06:00", "16:00", "20:00", "21:00"]),
            CompleteMarine(["04:00", "05:00", "06:00", "16:00", "20:00", "21:00"]));

        Assert.Equal(["06:00", "16:00", "20:00"], forecast.BestHours.Select(item => item.Time));
        Assert.Equal("06:00", forecast.BestHour?.Time);
        Assert.Equal(9.7, forecast.Score);
        Assert.Equal(6, forecast.Hours.Count);
        Assert.DoesNotContain(forecast.BestHours, item => item.Time is "04:00" or "21:00");
    }

    [Fact]
    public void Exactly_three_valid_hours_produce_their_current_daily_average()
    {
        string[] hours = ["05:00", "06:00", "07:00"];
        var forecast = FishingForecastService.BuildForecast(
            new FishingLocation { Id = "daily-three", Name = "Daily Three", SeaOrientationDegrees = 90, Profile = "praia_aberta" },
            new DateOnly(2026, 9, 27),
            CompleteWeather(hours, [0, 0.5, 2]),
            CompleteRain(hours),
            CompleteMarine(hours));

        var expected = Math.Round(forecast.Hours.Average(hour => hour.Score!.Value), 1, MidpointRounding.ToEven);
        Assert.Equal(expected, forecast.Score);
        Assert.Equal(3, forecast.BestHours.Count);
        Assert.NotNull(forecast.BestHour);
    }

    [Theory]
    [InlineData(2)]
    [InlineData(1)]
    [InlineData(0)]
    public void Daily_score_is_unavailable_with_fewer_than_three_valid_hours(int hourCount)
    {
        var hours = Enumerable.Range(5, hourCount).Select(hour => $"{hour:00}:00").ToArray();
        var forecast = FishingForecastService.BuildForecast(
            new FishingLocation { Id = "daily", Name = "Daily", SeaOrientationDegrees = 90, Profile = "praia_aberta" },
            new DateOnly(2026, 9, 27),
            CompleteWeather(hours, Enumerable.Repeat<double?>(0, hourCount).ToArray()),
            CompleteRain(hours),
            CompleteMarine(hours));

        Assert.Null(forecast.Score);
        Assert.Empty(forecast.BestHours);
        Assert.Null(forecast.BestHour);
        Assert.Equal(hourCount, forecast.Hours.Count);
    }

    [Fact]
    public void Three_real_zero_hour_scores_produce_an_available_zero_daily_score()
    {
        string[] hours = ["05:00", "06:00", "07:00"];
        var weather = CompleteWeather(hours, [12, 12, 12]);
        Replace(weather.Hourly.WindSpeed, 36, 3);
        Replace(weather.Hourly.WindDirection, 90, 3);
        Replace(weather.Hourly.WindGusts, 50, 3);
        Replace(weather.Hourly.PrecipitationProbability, 100, 3);
        var gfs = CompleteRain(hours);
        Replace(gfs.Hourly.Precipitation, 12, 3);
        Replace(gfs.Hourly.PrecipitationProbability, 100, 3);
        var marine = CompleteMarine(hours);
        Replace(marine.Hourly.WaveHeight, 3, 3);
        Replace(marine.Hourly.WavePeriod, 15, 3);

        var forecast = FishingForecastService.BuildForecast(
            new FishingLocation { Id = "daily-zero", Name = "Daily Zero", SeaOrientationDegrees = 90, Profile = "praia_aberta" },
            new DateOnly(2026, 9, 27),
            weather,
            gfs,
            marine);

        Assert.Equal(0, forecast.Score);
        Assert.Equal(3, forecast.BestHours.Count);
        Assert.All(forecast.BestHours, hour => Assert.Equal(0, hour.Score));
    }

    private static OpenMeteoResponse CompleteWeather(IReadOnlyList<string> hours, IReadOnlyList<double?> rain)
        => new()
        {
            Hourly = new OpenMeteoHourly
            {
                Time = ToIso(hours),
                WindSpeed = Enumerable.Repeat<double?>(8, hours.Count).ToList(),
                WindDirection = Enumerable.Repeat<double?>(270, hours.Count).ToList(),
                WindGusts = Enumerable.Repeat<double?>(0, hours.Count).ToList(),
                Precipitation = rain.ToList(),
                PrecipitationProbability = Enumerable.Repeat<double?>(0, hours.Count).ToList(),
                Temperature = Enumerable.Repeat<double?>(20, hours.Count).ToList(),
                PressureMsl = Enumerable.Repeat<double?>(1012, hours.Count).ToList()
            }
        };

    private static OpenMeteoResponse CompleteRain(IReadOnlyList<string> hours)
        => new()
        {
            Hourly = new OpenMeteoHourly
            {
                Time = ToIso(hours),
                Precipitation = Enumerable.Repeat<double?>(0, hours.Count).ToList(),
                PrecipitationProbability = Enumerable.Repeat<double?>(0, hours.Count).ToList()
            }
        };

    private static OpenMeteoResponse CompleteMarine(IReadOnlyList<string> hours)
        => new()
        {
            Hourly = new OpenMeteoHourly
            {
                Time = ToIso(hours),
                WaveHeight = Enumerable.Repeat<double?>(0.8, hours.Count).ToList(),
                WaveDirection = Enumerable.Repeat<double?>(90, hours.Count).ToList(),
                WavePeriod = Enumerable.Repeat<double?>(8, hours.Count).ToList(),
                SwellHeight = Enumerable.Repeat<double?>(0.5, hours.Count).ToList(),
                SwellDirection = Enumerable.Repeat<double?>(90, hours.Count).ToList(),
                SwellPeriod = Enumerable.Repeat<double?>(7, hours.Count).ToList(),
                WaterTemperature = Enumerable.Repeat<double?>(18, hours.Count).ToList()
            }
        };

    private static List<string> ToIso(IReadOnlyList<string> hours)
        => hours.Select(hour => $"2026-09-27T{hour}").ToList();

    private static void Replace(List<double?> values, double value, int count)
    {
        values.Clear();
        values.AddRange(Enumerable.Repeat<double?>(value, count));
    }

    private static double Calculate(
        double speed = 8,
        double gust = 0,
        double windFrom = 270,
        double? seaOrientation = 90,
        double waveHeight = 0.8,
        double wavePeriod = 8,
        double rainProbability = 0,
        double rainMm = 0,
        int hour = 6,
        string profile = "praia_aberta")
        => FishingScoreCalculator.Calculate(speed, gust, windFrom, seaOrientation, waveHeight, wavePeriod, rainProbability, rainMm, hour, profile);
}
