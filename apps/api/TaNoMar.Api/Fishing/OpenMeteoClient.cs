using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace TaNoMar.Api.Fishing;

internal sealed class OpenMeteoClient(HttpClient httpClient)
{
    private const string WeatherUrl = "https://api.open-meteo.com/v1/forecast";
    private const string GfsUrl = "https://api.open-meteo.com/v1/gfs";
    private const string MarineUrl = "https://marine-api.open-meteo.com/v1/marine";

    public Task<OpenMeteoResponse> GetWeatherAsync(FishingLocation location, string timezone, int forecastDays, CancellationToken cancellationToken)
        => GetAsync(
            WeatherUrl,
            location,
            timezone,
            forecastDays,
            "wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,precipitation_probability,temperature_2m,pressure_msl",
            cancellationToken,
            ("wind_speed_unit", "kmh"),
            ("precipitation_unit", "mm"));

    public Task<OpenMeteoResponse> GetGfsRainAsync(FishingLocation location, string timezone, int forecastDays, CancellationToken cancellationToken)
        => GetAsync(
            GfsUrl,
            location,
            timezone,
            forecastDays,
            "precipitation_probability,precipitation",
            cancellationToken,
            ("precipitation_unit", "mm"));

    public Task<OpenMeteoResponse> GetMarineAsync(FishingLocation location, string timezone, int forecastDays, CancellationToken cancellationToken)
        => GetAsync(
            MarineUrl,
            location,
            timezone,
            forecastDays,
            "wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period,sea_surface_temperature,sea_level_height_msl",
            cancellationToken);

    private async Task<OpenMeteoResponse> GetAsync(
        string baseUrl,
        FishingLocation location,
        string timezone,
        int forecastDays,
        string hourly,
        CancellationToken cancellationToken,
        params (string Name, string Value)[] extraParameters)
    {
        var parameters = new List<(string Name, string Value)>
        {
            ("latitude", location.Latitude.ToString(CultureInfo.InvariantCulture)),
            ("longitude", location.Longitude.ToString(CultureInfo.InvariantCulture)),
            ("timezone", timezone),
            ("forecast_days", forecastDays.ToString(CultureInfo.InvariantCulture)),
            ("hourly", hourly)
        };
        parameters.AddRange(extraParameters);

        var query = string.Join("&", parameters.Select(parameter =>
            $"{Uri.EscapeDataString(parameter.Name)}={Uri.EscapeDataString(parameter.Value)}"));
        var response = await httpClient.GetFromJsonAsync<OpenMeteoResponse>(
            $"{baseUrl}?{query}",
            cancellationToken);

        return response ?? throw new InvalidOperationException("Open-Meteo retornou uma resposta vazia.");
    }
}

internal sealed class OpenMeteoResponse
{
    [JsonPropertyName("hourly")]
    public OpenMeteoHourly Hourly { get; init; } = new();
}

internal sealed class OpenMeteoHourly
{
    [JsonPropertyName("time")]
    public List<string> Time { get; init; } = [];

    [JsonPropertyName("wind_speed_10m")]
    public List<double?> WindSpeed { get; init; } = [];

    [JsonPropertyName("wind_direction_10m")]
    public List<double?> WindDirection { get; init; } = [];

    [JsonPropertyName("wind_gusts_10m")]
    public List<double?> WindGusts { get; init; } = [];

    [JsonPropertyName("precipitation")]
    public List<double?> Precipitation { get; init; } = [];

    [JsonPropertyName("precipitation_probability")]
    public List<double?> PrecipitationProbability { get; init; } = [];

    [JsonPropertyName("temperature_2m")]
    public List<double?> Temperature { get; init; } = [];

    [JsonPropertyName("pressure_msl")]
    public List<double?> PressureMsl { get; init; } = [];

    [JsonPropertyName("sea_level_height_msl")]
    public List<double?> SeaLevelHeightMsl { get; init; } = [];

    [JsonPropertyName("wave_height")]
    public List<double?> WaveHeight { get; init; } = [];

    [JsonPropertyName("wave_direction")]
    public List<double?> WaveDirection { get; init; } = [];

    [JsonPropertyName("wave_period")]
    public List<double?> WavePeriod { get; init; } = [];

    [JsonPropertyName("swell_wave_height")]
    public List<double?> SwellHeight { get; init; } = [];

    [JsonPropertyName("swell_wave_direction")]
    public List<double?> SwellDirection { get; init; } = [];

    [JsonPropertyName("swell_wave_period")]
    public List<double?> SwellPeriod { get; init; } = [];

    [JsonPropertyName("sea_surface_temperature")]
    public List<double?> WaterTemperature { get; init; } = [];
}
