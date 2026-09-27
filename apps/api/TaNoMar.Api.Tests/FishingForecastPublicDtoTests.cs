using System.Text.Json;
using TaNoMar.Api.Data;
using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class FishingForecastPublicDtoTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly DateTimeOffset CreatedAt = new(2026, 9, 27, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset ExpiresAt = CreatedAt.AddHours(6);
    private static readonly TimeSpan RefreshAfter = TimeSpan.FromHours(3);
    private static readonly TimeSpan MaxStale = TimeSpan.FromHours(12);

    [Fact]
    public void Available_current_forecast_serializes_complete_fresh_quality_contract()
    {
        var evaluatedAt = CreatedAt.AddHours(1);

        var item = SerializedItem(Forecast("complete", 16), evaluatedAt);
        var quality = item.GetProperty("quality");
        var completeness = quality.GetProperty("dataCompleteness");
        var confidence = quality.GetProperty("confidence");

        Assert.Equal(16, completeness.GetProperty("validHours").GetInt32());
        Assert.Equal(16, completeness.GetProperty("expectedHours").GetInt32());
        Assert.Equal(1, completeness.GetProperty("ratio").GetDouble());
        Assert.Equal("high", confidence.GetProperty("level").GetString());
        Assert.Empty(confidence.GetProperty("reasons").EnumerateArray());
        Assert.Equal(CreatedAt, quality.GetProperty("dataUpdatedAt").GetDateTimeOffset());
        Assert.Equal(evaluatedAt, quality.GetProperty("evaluatedAt").GetDateTimeOffset());
        Assert.False(quality.TryGetProperty("coverageLevel", out _));
        Assert.False(quality.TryGetProperty("freshnessLevel", out _));
    }

    [Theory]
    [InlineData(10, "medium", ForecastConfidenceReasonCodes.LimitedHourCoverage)]
    [InlineData(4, "low", ForecastConfidenceReasonCodes.SparseHourCoverage)]
    public void Coverage_quality_is_derived_in_public_contract(
        int validHours,
        string expectedLevel,
        string expectedReason)
    {
        var item = SerializedItem(Forecast("coverage", validHours), CreatedAt.AddHours(1));
        var quality = item.GetProperty("quality");

        Assert.Equal(validHours, quality.GetProperty("dataCompleteness").GetProperty("validHours").GetInt32());
        Assert.Equal(expectedLevel, quality.GetProperty("confidence").GetProperty("level").GetString());
        Assert.Equal(
            [expectedReason],
            quality.GetProperty("confidence").GetProperty("reasons").EnumerateArray().Select(value => value.GetString()));
    }

    [Theory]
    [InlineData(4, "medium", ForecastConfidenceReasonCodes.SnapshotRefreshDue)]
    [InlineData(8, "low", ForecastConfidenceReasonCodes.StaleSnapshot)]
    public void Freshness_quality_uses_runtime_cache_policy(
        int ageHours,
        string expectedLevel,
        string expectedReason)
    {
        var item = SerializedItem(Forecast("freshness", 16), CreatedAt.AddHours(ageHours));
        var confidence = item.GetProperty("quality").GetProperty("confidence");

        Assert.Equal(expectedLevel, confidence.GetProperty("level").GetString());
        Assert.Equal(
            [expectedReason],
            confidence.GetProperty("reasons").EnumerateArray().Select(value => value.GetString()));
    }

    [Fact]
    public void Reduced_coverage_and_stale_snapshot_serialize_both_reasons_in_order()
    {
        var item = SerializedItem(Forecast("combined", 10), CreatedAt.AddHours(8));
        var confidence = item.GetProperty("quality").GetProperty("confidence");

        Assert.Equal("low", confidence.GetProperty("level").GetString());
        Assert.Equal(
            [ForecastConfidenceReasonCodes.LimitedHourCoverage, ForecastConfidenceReasonCodes.StaleSnapshot],
            confidence.GetProperty("reasons").EnumerateArray().Select(value => value.GetString()));
    }

    [Fact]
    public void Ranking_order_remains_score_based_when_confidence_differs()
    {
        var highScoreLowConfidence = Forecast("a", 4, 9.0);
        var lowScoreHighConfidence = Forecast("b", 16, 8.5);
        var forecast = FishingForecastAvailability.FilterRanking(Envelope(
            [lowScoreHighConfidence, highScoreLowConfidence],
            new Dictionary<string, ForecastSnapshotMetadata>(StringComparer.Ordinal)
            {
                ["a"] = new(CreatedAt, ExpiresAt),
                ["b"] = new(CreatedAt, ExpiresAt)
            }));

        var json = SerializeDay(forecast, CreatedAt.AddHours(1));
        var items = json.GetProperty("ranking").EnumerateArray().ToArray();

        Assert.Equal(["a", "b"], items.Select(item => item.GetProperty("spotId").GetString()));
        Assert.Equal("low", items[0].GetProperty("quality").GetProperty("confidence").GetProperty("level").GetString());
        Assert.Equal("high", items[1].GetProperty("quality").GetProperty("confidence").GetProperty("level").GetString());
    }

    [Fact]
    public void Ranking_emphasis_reorders_by_metric_without_using_confidence()
    {
        var highScoreLowWind = WithWind(Forecast("a", 4, 9.0), 5);
        var lowScoreHighWind = WithWind(Forecast("b", 16, 8.5), 20);
        var forecast = Envelope(
            [highScoreLowWind, lowScoreHighWind],
            new Dictionary<string, ForecastSnapshotMetadata>(StringComparer.Ordinal)
            {
                ["a"] = new(CreatedAt, ExpiresAt),
                ["b"] = new(CreatedAt, ExpiresAt)
            });
        var emphasized = forecast with
        {
            Ranking = FishingRankingEmphasis.Order(forecast.Ranking, FishingRankingEmphasis.WindMore)
        };

        var items = SerializeDay(emphasized, CreatedAt.AddHours(1)).GetProperty("ranking").EnumerateArray().ToArray();

        Assert.Equal(["b", "a"], items.Select(item => item.GetProperty("spotId").GetString()));
        Assert.Equal("high", items[0].GetProperty("quality").GetProperty("confidence").GetProperty("level").GetString());
        Assert.Equal("low", items[1].GetProperty("quality").GetProperty("confidence").GetProperty("level").GetString());
    }

    [Fact]
    public void Each_ranking_item_uses_its_own_snapshot_metadata()
    {
        var firstCreatedAt = CreatedAt;
        var secondCreatedAt = CreatedAt.AddHours(-2);
        var evaluatedAt = CreatedAt.AddHours(1);
        var forecast = Envelope(
            [Forecast("a", 16, 9), Forecast("b", 16, 8)],
            new Dictionary<string, ForecastSnapshotMetadata>(StringComparer.Ordinal)
            {
                ["a"] = new(firstCreatedAt, ExpiresAt),
                ["b"] = new(secondCreatedAt, ExpiresAt)
            });

        var items = SerializeDay(forecast, evaluatedAt).GetProperty("ranking").EnumerateArray().ToArray();

        Assert.Equal(firstCreatedAt, items[0].GetProperty("quality").GetProperty("dataUpdatedAt").GetDateTimeOffset());
        Assert.Equal(secondCreatedAt, items[1].GetProperty("quality").GetProperty("dataUpdatedAt").GetDateTimeOffset());
        Assert.All(items, item => Assert.Equal(
            evaluatedAt,
            item.GetProperty("quality").GetProperty("evaluatedAt").GetDateTimeOffset()));
        Assert.Equal("high", items[0].GetProperty("quality").GetProperty("confidence").GetProperty("level").GetString());
        Assert.Equal("medium", items[1].GetProperty("quality").GetProperty("confidence").GetProperty("level").GetString());
    }

    [Fact]
    public void Location_detail_day_contract_contains_quality()
    {
        var forecast = Envelope([Forecast("detail", 16)]);
        var json = JsonSerializer.SerializeToElement(
            FishingForecastPublicDto.Day(
                forecast,
                CreatedAt.AddHours(1),
                paid: true,
                bestHoursMode: PlanRules.DefaultBestHoursMode,
                includeSelectableHours: true),
            JsonOptions);

        var item = json.GetProperty("ranking")[0];
        Assert.Equal("high", item.GetProperty("quality").GetProperty("confidence").GetProperty("level").GetString());
        Assert.True(item.TryGetProperty("selectableHourWindows", out _));
    }

    [Fact]
    public void Wind_preference_changes_forecast_without_losing_runtime_quality_context()
    {
        var original = Forecast("wind", 16, 8);
        var personalized = FishingWindPreference.Apply(original, 270, 90, "praia_aberta");
        var context = Context(new Dictionary<string, ForecastSnapshotMetadata>(StringComparer.Ordinal)
        {
            ["wind"] = new(CreatedAt, ExpiresAt)
        });
        var before = Envelope([original], context.Snapshots);
        var after = before with { Ranking = [personalized] };

        var beforeQuality = SerializeDay(before, CreatedAt.AddHours(1)).GetProperty("ranking")[0].GetProperty("quality");
        var afterQuality = SerializeDay(after, CreatedAt.AddHours(1)).GetProperty("ranking")[0].GetProperty("quality");

        Assert.NotEqual(original.Score, personalized.Score);
        Assert.Same(before.QualityContext, after.QualityContext);
        Assert.Equal(beforeQuality.GetRawText(), afterQuality.GetRawText());
    }

    [Theory]
    [InlineData(null)]
    [InlineData(999)]
    public void Non_current_forecast_is_not_published_with_quality(int? dataQualityVersion)
    {
        var item = Forecast("invalid", 16) with { DataQualityVersion = dataQualityVersion };

        var filtered = FishingForecastAvailability.FilterRanking(Envelope([item]));
        var json = SerializeDay(filtered, CreatedAt.AddHours(1));

        Assert.Empty(json.GetProperty("ranking").EnumerateArray());
        Assert.Equal("invalid", Assert.Single(json.GetProperty("unavailableSpotIds").EnumerateArray()).GetString());
    }

    [Fact]
    public void Current_snapshot_created_before_quality_feature_is_enriched_without_payload_rewrite()
    {
        var original = Forecast("old-current", 16);
        var payload = JsonSerializer.Serialize(original, JsonOptions);
        var persisted = JsonSerializer.Deserialize<JsonElement>(payload, JsonOptions);
        Assert.False(persisted.TryGetProperty("quality", out _));
        Assert.False(persisted.TryGetProperty("dataCompleteness", out _));
        var restored = JsonSerializer.Deserialize<FishingLocationForecast>(payload, JsonOptions)!;

        var item = SerializedItem(restored, CreatedAt.AddHours(1));

        Assert.Equal("high", item.GetProperty("quality").GetProperty("confidence").GetProperty("level").GetString());
    }

    [Fact]
    public void Score_zero_remains_published_with_high_quality()
    {
        var item = SerializedItem(Forecast("zero", 16, 0), CreatedAt.AddHours(1));

        Assert.Equal(0, item.GetProperty("score").GetProperty("value").GetDouble());
        Assert.Equal("high", item.GetProperty("quality").GetProperty("confidence").GetProperty("level").GetString());
    }

    [Fact]
    public void Public_offline_day_contract_contains_the_same_quality_block()
    {
        var json = SerializeDay(Envelope([Forecast("offline", 16)]), CreatedAt.AddHours(1), paid: false);

        Assert.Equal("high", json.GetProperty("ranking")[0].GetProperty("quality").GetProperty("confidence").GetProperty("level").GetString());
    }

    [Fact]
    public void Quality_is_not_projected_when_snapshot_is_outside_max_stale()
    {
        var item = SerializedItem(Forecast("expired", 16), CreatedAt + MaxStale);

        Assert.Equal(JsonValueKind.Null, item.GetProperty("quality").ValueKind);
    }

    [Fact]
    public void Marine_source_forecast_does_not_embed_quality()
    {
        var json = JsonSerializer.SerializeToElement(Forecast("marine", 16), JsonOptions);

        Assert.False(json.TryGetProperty("quality", out _));
        Assert.False(json.TryGetProperty("confidence", out _));
        Assert.False(json.TryGetProperty("dataCompleteness", out _));
        Assert.False(json.TryGetProperty("evaluatedAt", out _));
    }

    private static JsonElement SerializedItem(FishingLocationForecast forecast, DateTimeOffset evaluatedAt)
        => SerializeDay(Envelope([forecast]), evaluatedAt).GetProperty("ranking")[0];

    private static JsonElement SerializeDay(
        FishingForecast forecast,
        DateTimeOffset evaluatedAt,
        bool paid = true)
        => JsonSerializer.SerializeToElement(
            FishingForecastPublicDto.Day(forecast, evaluatedAt, paid, PlanRules.DefaultBestHoursMode),
            JsonOptions);

    private static FishingForecast Envelope(
        IReadOnlyList<FishingLocationForecast> ranking,
        IReadOnlyDictionary<string, ForecastSnapshotMetadata>? snapshots = null)
    {
        snapshots ??= ranking.ToDictionary(
            item => item.Id,
            _ => new ForecastSnapshotMetadata(CreatedAt, ExpiresAt),
            StringComparer.Ordinal);
        return new FishingForecast(
            CreatedAt,
            new DateOnly(2026, 9, 27),
            ranking,
            [],
            QualityContext: Context(snapshots));
    }

    private static ForecastQualityContext Context(IReadOnlyDictionary<string, ForecastSnapshotMetadata> snapshots)
        => new(snapshots, RefreshAfter, MaxStale);

    private static FishingLocationForecast WithWind(FishingLocationForecast forecast, double windSpeedKmh)
    {
        var hours = forecast.Hours.Select(hour => hour with { WindSpeedKmh = windSpeedKmh }).ToArray();
        var bestHours = forecast.BestHours
            .Select(best => hours.First(hour => hour.Time == best.Time))
            .ToArray();
        return forecast with
        {
            Hours = hours,
            BestHours = bestHours,
            BestHour = bestHours.FirstOrDefault()
        };
    }

    private static FishingLocationForecast Forecast(
        string id,
        int validHours,
        double score = 8)
    {
        var hours = Enumerable.Range(0, validHours)
            .Select(index => Hour($"{index + 5:00}:00", score))
            .ToArray();
        var bestHours = hours.Take(3).ToArray();
        return new FishingLocationForecast(
            id,
            id,
            new DateOnly(2026, 9, 27),
            validHours >= 3 ? score : null,
            validHours >= 3 ? bestHours : [],
            validHours >= 3 ? bestHours.FirstOrDefault() : null,
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
        PressureHpa: 1015,
        WindDirectionDegrees: 90);
}
