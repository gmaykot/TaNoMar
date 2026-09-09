using System.Text.Json;
using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class ForecastHourWindowDtoTests
{
    [Fact]
    public void Includes_formatted_metrics_for_a_paid_plan()
    {
        var json = JsonSerializer.SerializeToElement(ForecastHourWindowDto.Create(Hour(), paid: true));

        Assert.Equal("05:00", json.GetProperty("time").GetString());
        Assert.Equal(9.1, json.GetProperty("score").GetDouble());
        Assert.Equal("terra", json.GetProperty("windOrigin").GetString());
        Assert.Equal("available", json.GetProperty("wind").GetProperty("state").GetString());
        Assert.Equal("8 km/h Leste", json.GetProperty("wind").GetProperty("value").GetString());
        Assert.Equal("12 km/h", json.GetProperty("gusts").GetProperty("value").GetString());
        Assert.Equal("0,80 m", json.GetProperty("waves").GetProperty("value").GetString());
        Assert.Equal("Leste", json.GetProperty("waveDirection").GetString());
        Assert.Equal("8 s", json.GetProperty("wavePeriod").GetProperty("value").GetString());
        Assert.Equal("0,50 m", json.GetProperty("swell").GetProperty("value").GetString());
        Assert.Equal("0 mm (10%)", json.GetProperty("rain").GetProperty("value").GetString());
        Assert.Equal("20 °C", json.GetProperty("airTemperature").GetProperty("value").GetString());
        Assert.Equal("18 °C", json.GetProperty("waterTemperature").GetProperty("value").GetString());
        Assert.Equal("1012 hPa", json.GetProperty("pressure").GetProperty("value").GetString());
        Assert.Contains("Vento de terra", json.GetProperty("highlights").EnumerateArray().Select(item => item.GetString()));
    }

    [Fact]
    public void Locks_wave_and_pressure_metrics_on_the_free_plan()
    {
        var json = JsonSerializer.SerializeToElement(ForecastHourWindowDto.Create(Hour(), paid: false));

        Assert.Equal("available", json.GetProperty("wind").GetProperty("state").GetString());
        Assert.Equal("available", json.GetProperty("rain").GetProperty("state").GetString());
        Assert.Equal("locked", json.GetProperty("waves").GetProperty("state").GetString());
        Assert.Equal("locked", json.GetProperty("wavePeriod").GetProperty("state").GetString());
        Assert.Equal("locked", json.GetProperty("swell").GetProperty("state").GetString());
        Assert.Equal("locked", json.GetProperty("waterTemperature").GetProperty("state").GetString());
        Assert.Equal("locked", json.GetProperty("pressure").GetProperty("state").GetString());
        Assert.Equal("Assinatura", json.GetProperty("waves").GetProperty("requiredPlan").GetString());
    }

    private static FishingHourForecast Hour() => new(
        "05:00",
        9.1,
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
