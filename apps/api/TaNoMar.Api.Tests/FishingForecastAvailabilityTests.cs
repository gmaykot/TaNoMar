using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class FishingForecastAvailabilityTests
{
    [Fact]
    public void Mixed_ranking_keeps_only_available_daily_scores_in_score_order()
    {
        var forecast = Forecast(
            Location("unavailable", null),
            Location("second", 7.2),
            Location("first", 8.4));

        var result = FishingForecastAvailability.FilterRanking(forecast);

        Assert.Equal(["first", "second"], result.Ranking.Select(item => item.Id));
        Assert.DoesNotContain(result.Ranking, item => item.Score is null);
        Assert.Contains(result.Errors, error => error.Location == "unavailable");
    }

    [Fact]
    public void Existing_cache_miss_and_unavailable_daily_score_both_remain_unavailable()
    {
        var forecast = Forecast(Location("insufficient-hours", null)) with
        {
            Errors = [new FishingForecastError("cache-miss", "Previsão em atualização.")]
        };

        var result = FishingForecastAvailability.FilterRanking(forecast);

        Assert.Equal(["cache-miss", "insufficient-hours"], result.Errors.Select(error => error.Location));
    }

    [Fact]
    public void Unavailable_ids_are_deduplicated_deterministically()
    {
        var forecast = Forecast(Location("same", null)) with
        {
            Errors =
            [
                new FishingForecastError("same", "Previsão em atualização."),
                new FishingForecastError("same", "Falha repetida.")
            ]
        };

        var result = FishingForecastAvailability.FilterRanking(forecast);

        Assert.Equal(["same"], result.Errors.Select(error => error.Location));
    }

    [Fact]
    public void Legacy_score_with_fewer_than_three_best_hours_is_not_ranked_as_available()
    {
        var complete = Location("legacy", 8.0);
        var onlyHour = complete.BestHours[0];
        var legacy = complete with { BestHours = [onlyHour], BestHour = onlyHour, Hours = [onlyHour] };

        var result = FishingForecastAvailability.FilterRanking(Forecast(legacy));

        Assert.Empty(result.Ranking);
        Assert.Equal(["legacy"], result.Errors.Select(error => error.Location));
    }

    [Fact]
    public void Legacy_complete_score_is_not_ranked_and_is_reported_unavailable()
    {
        var legacy = Location("legacy", 9.0) with { DataQualityVersion = null };

        var result = FishingForecastAvailability.FilterRanking(Forecast(legacy));

        Assert.Empty(result.Ranking);
        Assert.Equal(["legacy"], result.Errors.Select(error => error.Location));
    }

    [Fact]
    public void Real_zero_score_remains_available_when_quality_version_is_current()
    {
        var result = FishingForecastAvailability.FilterRanking(Forecast(Location("zero", 0)));

        var item = Assert.Single(result.Ranking);
        Assert.Equal(0, item.Score);
        Assert.Empty(result.Errors);
    }

    [Fact]
    public void Ranking_emphasis_never_returns_an_unavailable_daily_score()
    {
        var ranking = new[] { Location("unavailable", null), Location("available", 7.5) };

        var result = FishingRankingEmphasis.Order(ranking, FishingRankingEmphasis.Wind);

        Assert.Equal(["available"], result.Select(item => item.Id));
    }

    [Fact]
    public void FilterRanking_preserves_runtime_quality_context()
    {
        var context = new ForecastQualityContext(
            new Dictionary<string, ForecastSnapshotMetadata>(StringComparer.Ordinal)
            {
                ["first"] = new(DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(6))
            },
            TimeSpan.FromHours(3),
            TimeSpan.FromHours(12));
        var forecast = Forecast(Location("unavailable", null), Location("first", 8.4)) with
        {
            QualityContext = context
        };

        var result = FishingForecastAvailability.FilterRanking(forecast);

        Assert.Same(context, result.QualityContext);
        Assert.Equal(["first"], result.Ranking.Select(item => item.Id));
    }

    private static FishingForecast Forecast(params FishingLocationForecast[] ranking)
        => new(DateTimeOffset.UtcNow, new DateOnly(2026, 9, 27), ranking, []);

    private static FishingLocationForecast Location(string id, double? score)
    {
        var hour = new FishingHourForecast(
            "06:00", score, 8, 10, "Leste", 0, 20, 18, 0, 0, 0,
            0.8, 8, 0.5, 7, "Leste", "Leste", null, 1012);
        IReadOnlyList<FishingHourForecast> bestHours = score is null
            ? []
            : [hour, hour with { Time = "07:00" }, hour with { Time = "08:00" }];
        return new FishingLocationForecast(
            id, id, new DateOnly(2026, 9, 27), score, bestHours, score is null ? null : hour, bestHours,
            DataQualityVersion: FishingForecastDataQuality.CurrentVersion);
    }
}
