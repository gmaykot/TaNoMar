using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class ScoringDataCompletenessTests
{
    [Theory]
    [InlineData(16, 1.0)]
    [InlineData(12, 0.75)]
    [InlineData(8, 0.5)]
    [InlineData(4, 0.25)]
    [InlineData(3, 0.1875)]
    public void Counts_valid_scoring_slots_and_calculates_ratio(int validHours, double expectedRatio)
    {
        var result = ScoringDataCompleteness.FromForecast(Forecast(Hours(validHours)));

        Assert.Equal(16, result.ExpectedHours);
        Assert.Equal(validHours, result.ValidHours);
        Assert.Equal(expectedRatio, result.Ratio);
    }

    [Fact]
    public void Two_valid_hours_are_counted_but_daily_score_remains_unavailable()
    {
        var forecast = Forecast(Hours(2)) with
        {
            Score = null,
            BestHours = [],
            BestHour = null
        };

        var completeness = ScoringDataCompleteness.FromForecast(forecast);

        Assert.Equal(2, completeness.ValidHours);
        Assert.False(FishingForecastAvailability.IsDailyScoreAvailable(forecast));
    }

    [Fact]
    public void Real_zero_score_counts_as_a_valid_hour()
    {
        var forecast = Forecast([Hour("05:00", 0)]);

        var result = ScoringDataCompleteness.FromForecast(forecast);

        Assert.Equal(1, result.ValidHours);
    }

    [Fact]
    public void Duplicate_slot_does_not_increase_coverage()
    {
        var forecast = Forecast([Hour("05:00", 8), Hour("05:00", 7)]);

        var result = ScoringDataCompleteness.FromForecast(forecast);

        Assert.Equal(1, result.ValidHours);
    }

    [Fact]
    public void Missing_slot_reduces_coverage()
    {
        var forecast = Forecast(Hours(16).Where(hour => hour.Time != "12:00").ToList());

        var result = ScoringDataCompleteness.FromForecast(forecast);

        Assert.Equal(15, result.ValidHours);
    }

    [Fact]
    public void Unavailable_hour_does_not_count_as_valid()
    {
        var forecast = Forecast(
        [
            Hour("05:00", 8),
            Hour("06:00", null, FishingScoreAvailability.Unavailable)
        ]);

        var result = ScoringDataCompleteness.FromForecast(forecast);

        Assert.Equal(1, result.ValidHours);
    }

    [Fact]
    public void Null_score_does_not_count_even_when_availability_is_available()
    {
        var forecast = Forecast([Hour("05:00", null)]);

        var result = ScoringDataCompleteness.FromForecast(forecast);

        Assert.Equal(0, result.ValidHours);
    }

    [Fact]
    public void Hours_outside_daily_window_do_not_count()
    {
        var forecast = Forecast(
        [
            ..Hours(16),
            Hour("04:00", 8),
            Hour("21:00", 8)
        ]);

        var result = ScoringDataCompleteness.FromForecast(forecast);

        Assert.Equal(16, result.ValidHours);
    }

    private static FishingLocationForecast Forecast(IReadOnlyList<FishingHourForecast> hours)
        => new(
            "completeness",
            "Completeness",
            new DateOnly(2026, 9, 27),
            hours.Count >= 3 ? 8 : null,
            hours.Count >= 3 ? hours.Take(3).ToArray() : [],
            hours.FirstOrDefault(),
            hours,
            DataQualityVersion: FishingForecastDataQuality.CurrentVersion);

    private static List<FishingHourForecast> Hours(int count)
        => Enumerable.Range(0, count)
            .Select(index => Hour($"{index + 5:00}:00", 8))
            .ToList();

    private static FishingHourForecast Hour(
        string time,
        double? score,
        FishingScoreAvailability availability = FishingScoreAvailability.Available)
        => new(
            time,
            score,
            8,
            10,
            "Leste",
            0,
            20,
            18,
            0,
            0,
            0,
            0.8,
            8,
            0.5,
            7,
            "Leste",
            "Leste",
            null,
            1012,
            ScoreAvailability: availability);
}
