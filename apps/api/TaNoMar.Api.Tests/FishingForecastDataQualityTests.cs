using System.Text.Json;
using System.Text.Json.Nodes;
using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class FishingForecastDataQualityTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public void Current_version_roundtrip_is_preserved()
    {
        var original = Forecast(FishingForecastDataQuality.CurrentVersion);

        var json = JsonSerializer.Serialize(original, JsonOptions);
        var roundtrip = JsonSerializer.Deserialize<FishingLocationForecast>(json, JsonOptions);

        Assert.Contains("\"dataQualityVersion\":1", json, StringComparison.Ordinal);
        Assert.Equal(FishingForecastDataQuality.CurrentVersion, roundtrip?.DataQualityVersion);
        Assert.Equal(FishingForecastDataQualityState.Current,
            FishingForecastDataQuality.State(roundtrip?.DataQualityVersion));
    }

    [Fact]
    public void Json_without_version_remains_legacy()
    {
        var json = JsonNode.Parse(JsonSerializer.Serialize(Forecast(1), JsonOptions))!.AsObject();
        Assert.True(json.Remove("dataQualityVersion"));

        var forecast = JsonSerializer.Deserialize<FishingLocationForecast>(json.ToJsonString(), JsonOptions);

        Assert.Null(forecast?.DataQualityVersion);
        Assert.Equal(FishingForecastDataQualityState.Legacy,
            FishingForecastDataQuality.State(forecast?.DataQualityVersion));
    }

    [Theory]
    [InlineData(0, FishingForecastDataQualityState.Legacy)]
    [InlineData(999, FishingForecastDataQualityState.Incompatible)]
    public void Non_current_versions_are_not_accepted(
        int version,
        FishingForecastDataQualityState expectedState)
    {
        var json = JsonSerializer.Serialize(Forecast(version), JsonOptions);
        var forecast = JsonSerializer.Deserialize<FishingLocationForecast>(json, JsonOptions)!;

        Assert.Equal(expectedState, FishingForecastDataQuality.State(forecast.DataQualityVersion));
        Assert.False(FishingForecastDataQuality.IsCurrent(forecast));
    }

    private static FishingLocationForecast Forecast(int? version)
    {
        var hour = new FishingHourForecast(
            "06:00", 8, 8, 10, "Leste", 0, 20, 18, 0, 0, 0,
            0.8, 8, 0.5, 7, "Leste", "Leste", null, 1012);
        var bestHours = new[] { hour, hour with { Time = "07:00" }, hour with { Time = "08:00" } };
        return new FishingLocationForecast(
            "spot", "Spot", new DateOnly(2026, 9, 27), 8, bestHours, hour, bestHours,
            DataQualityVersion: version);
    }
}
