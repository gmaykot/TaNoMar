using System.Globalization;
using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace TaNoMar.Api.Fishing;

internal sealed class OpenMeteoClient(
    HttpClient httpClient,
    IOptions<FishingOptions> options,
    ILogger<OpenMeteoClient> logger)
{
    public Task<OpenMeteoResponse> GetWeatherAsync(FishingLocation location, string timezone, int forecastDays, CancellationToken cancellationToken)
        => GetAsync(
            "Weather",
            options.Value.OpenMeteoWeatherBaseUrl,
            location,
            timezone,
            forecastDays,
            "wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,precipitation_probability,temperature_2m,pressure_msl",
            cancellationToken,
            ("wind_speed_unit", "kmh"),
            ("precipitation_unit", "mm"));

    public Task<OpenMeteoResponse> GetGfsRainAsync(FishingLocation location, string timezone, int forecastDays, CancellationToken cancellationToken)
        => GetAsync(
            "GFS",
            options.Value.OpenMeteoGfsBaseUrl,
            location,
            timezone,
            forecastDays,
            "precipitation_probability,precipitation",
            cancellationToken,
            ("precipitation_unit", "mm"));

    public Task<OpenMeteoResponse> GetMarineAsync(FishingLocation location, string timezone, int forecastDays, CancellationToken cancellationToken)
        => GetAsync(
            "Marine",
            options.Value.OpenMeteoMarineBaseUrl,
            location,
            timezone,
            forecastDays,
            "wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period,sea_surface_temperature,sea_level_height_msl",
            cancellationToken);

    public Task<IReadOnlyList<OpenMeteoResponse>> GetWeatherBatchAsync(
        IReadOnlyList<FishingLocation> locations,
        string timezone,
        int forecastDays,
        CancellationToken cancellationToken)
        => GetBatchAsync(
            "Weather",
            options.Value.OpenMeteoWeatherBaseUrl,
            locations,
            timezone,
            forecastDays,
            "wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,precipitation_probability,temperature_2m,pressure_msl",
            cancellationToken,
            ("wind_speed_unit", "kmh"),
            ("precipitation_unit", "mm"));

    public Task<IReadOnlyList<OpenMeteoResponse>> GetGfsRainBatchAsync(
        IReadOnlyList<FishingLocation> locations,
        string timezone,
        int forecastDays,
        CancellationToken cancellationToken)
        => GetBatchAsync(
            "GFS",
            options.Value.OpenMeteoGfsBaseUrl,
            locations,
            timezone,
            forecastDays,
            "precipitation_probability,precipitation",
            cancellationToken,
            ("precipitation_unit", "mm"));

    public Task<IReadOnlyList<OpenMeteoResponse>> GetMarineBatchAsync(
        IReadOnlyList<FishingLocation> locations,
        string timezone,
        int forecastDays,
        CancellationToken cancellationToken)
        => GetBatchAsync(
            "Marine",
            options.Value.OpenMeteoMarineBaseUrl,
            locations,
            timezone,
            forecastDays,
            "wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period,sea_surface_temperature,sea_level_height_msl",
            cancellationToken);

    private async Task<OpenMeteoResponse> GetAsync(
        string source,
        string baseUrl,
        FishingLocation location,
        string timezone,
        int forecastDays,
        string hourly,
        CancellationToken cancellationToken,
        params (string Name, string Value)[] extraParameters)
    {
        var response = await GetResponseAsync<OpenMeteoResponse>(
            source,
            baseUrl,
            [location],
            timezone,
            forecastDays,
            hourly,
            cancellationToken,
            extraParameters);

        return response;
    }

    private async Task<IReadOnlyList<OpenMeteoResponse>> GetBatchAsync(
        string source,
        string baseUrl,
        IReadOnlyList<FishingLocation> locations,
        string timezone,
        int forecastDays,
        string hourly,
        CancellationToken cancellationToken,
        params (string Name, string Value)[] extraParameters)
    {
        if (locations.Count == 0)
            return [];
        if (locations.Count == 1)
            return [await GetAsync(source, baseUrl, locations[0], timezone, forecastDays, hourly, cancellationToken, extraParameters)];

        var response = await GetResponseAsync<List<OpenMeteoResponse>>(
            source,
            baseUrl,
            locations,
            timezone,
            forecastDays,
            hourly,
            cancellationToken,
            extraParameters);
        if (response.Count != locations.Count)
            throw new InvalidOperationException($"Open-Meteo {source} devolveu {response.Count} locais para um lote de {locations.Count}.");
        return response;
    }

    private async Task<T> GetResponseAsync<T>(
        string source,
        string baseUrl,
        IReadOnlyList<FishingLocation> locations,
        string timezone,
        int forecastDays,
        string hourly,
        CancellationToken cancellationToken,
        params (string Name, string Value)[] extraParameters)
    {
        var parameters = new List<(string Name, string Value)>
        {
            ("latitude", string.Join(',', locations.Select(location => location.Latitude.ToString(CultureInfo.InvariantCulture)))),
            ("longitude", string.Join(',', locations.Select(location => location.Longitude.ToString(CultureInfo.InvariantCulture)))),
            ("timezone", timezone),
            ("forecast_days", forecastDays.ToString(CultureInfo.InvariantCulture)),
            ("hourly", hourly)
        };
        parameters.AddRange(extraParameters);
        if (!string.IsNullOrWhiteSpace(options.Value.OpenMeteoApiKey))
            parameters.Add(("apikey", options.Value.OpenMeteoApiKey));

        var query = string.Join("&", parameters.Select(parameter =>
            $"{Uri.EscapeDataString(parameter.Name)}={Uri.EscapeDataString(parameter.Value)}"));
        var started = Stopwatch.StartNew();
        try
        {
            var response = await httpClient.GetFromJsonAsync<T>($"{baseUrl}?{query}", cancellationToken);
            logger.LogInformation(
                "Open-Meteo {Source}: {Locations} locais, {ForecastDays} dias, {ElapsedMs}ms.",
                source,
                locations.Count,
                forecastDays,
                started.ElapsedMilliseconds);
            return response ?? throw new InvalidOperationException("Open-Meteo retornou uma resposta vazia.");
        }
        catch (Exception exception) when (exception is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(
                exception,
                "Falha no Open-Meteo {Source}: {Locations} locais após {ElapsedMs}ms.",
                source,
                locations.Count,
                started.ElapsedMilliseconds);
            throw;
        }
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
