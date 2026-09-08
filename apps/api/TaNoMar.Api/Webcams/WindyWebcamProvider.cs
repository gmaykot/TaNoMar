using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace TaNoMar.Api.Webcams;

internal sealed class WindyWebcamProvider(
    HttpClient httpClient,
    IOptions<WebcamOptions> options,
    IHostEnvironment environment,
    ILogger<WindyWebcamProvider> logger) : IWebcamProvider
{
    private const string Include = "images,location,player,urls";
    public string ProviderId => WebcamOptions.WindyProviderId;
    public string DisplayName => WebcamOptions.WindyDisplayName;
    public bool IsConfigured => options.Value.IsConfigured;

    public async Task<IReadOnlyList<WebcamSearchHit>> SearchNearbyAsync(
        double latitude,
        double longitude,
        double radiusKm,
        CancellationToken cancellationToken)
    {
        EnsureConfigured();
        var radius = Math.Clamp(radiusKm, 1, 250);
        var limit = options.Value.EffectiveSearchLimit;
        var nearby = string.Create(CultureInfo.InvariantCulture, $"{latitude},{longitude},{radius}");
        var path = $"webcams?nearby={Uri.EscapeDataString(nearby)}&include={Include}&limit={limit}&lang=pt";
        if (environment.IsDevelopment())
            logger.LogInformation("WebcamSearch latitude={Latitude} longitude={Longitude} radiusKm={RadiusKm}", latitude, longitude, radius);

        var payload = await GetStringAsync(path, cancellationToken, allowNotFound: false)
            ?? throw new WebcamProviderException("Windy Webcams devolveu resposta vazia.");
        try
        {
            var parsed = WindyWebcamMapper.ParseList(payload);
            var usable = parsed
                .Select(item => WindyWebcamMapper.ToSearchHit(item, latitude, longitude))
                .Where(item => item is not null)
                .Cast<WebcamSearchHit>()
                .OrderBy(item => item.DistanceKm)
                .ThenBy(item => item.Name, StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (environment.IsDevelopment())
                logger.LogInformation(
                    "WebcamSearch found={Found} usable={Usable}",
                    parsed.Count,
                    usable.Count);

            return usable;
        }
        catch (JsonException exception)
        {
            logger.LogError(exception, "WebcamProviderError json action=search");
            throw new WebcamProviderException("Resposta inválida da Windy Webcams.", exception);
        }
    }

    public Task<IReadOnlyList<WebcamSearchHit>> LookupAsync(
        string query,
        double latitude,
        double longitude,
        CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<WebcamSearchHit>>([]);

    public async Task<WebcamProviderDetails?> GetAsync(string externalId, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        if (string.IsNullOrWhiteSpace(externalId)) return null;
        var id = Uri.EscapeDataString(externalId.Trim());
        var path = $"webcams/{id}?include={Include}&lang=pt";
        var payload = await GetStringAsync(path, cancellationToken, allowNotFound: true);
        if (payload is null) return null;
        try
        {
            var dto = WindyWebcamMapper.ParseOne(payload);
            var details = WindyWebcamMapper.ToDetails(dto, dto?.Location?.Latitude ?? 0, dto?.Location?.Longitude ?? 0);
            if (environment.IsDevelopment())
                logger.LogInformation(
                    "WebcamGet externalId={ExternalId} valid={Valid} live={Live} hasPlayer={HasPlayer}",
                    externalId,
                    details?.IsUsable == true,
                    details?.IsLive == true,
                    details?.HasPlayer == true);
            return details;
        }
        catch (JsonException exception)
        {
            logger.LogError(exception, "WebcamProviderError json action=get");
            throw new WebcamProviderException("Resposta inválida da Windy Webcams.", exception);
        }
    }

    private void EnsureConfigured()
    {
        if (IsConfigured) return;
        if (environment.IsDevelopment())
            logger.LogInformation("Windy configurado: Não");
        throw new WebcamNotConfiguredException();
    }

    private async Task<string?> GetStringAsync(string path, CancellationToken cancellationToken, bool allowNotFound)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.TryAddWithoutValidation("x-windy-api-key", options.Value.WindyApiKey);
        try
        {
            using var response = await httpClient.SendAsync(request, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (allowNotFound && response.StatusCode == System.Net.HttpStatusCode.NotFound)
                return null;
            if (!response.IsSuccessStatusCode)
            {
                logger.LogError("WebcamProviderError status={Status} path={Path}", (int)response.StatusCode, path);
                throw new WebcamProviderException($"Windy Webcams respondeu {(int)response.StatusCode}.");
            }
            return body;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (WebcamProviderException)
        {
            throw;
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or InvalidOperationException)
        {
            logger.LogError(exception, "WebcamProviderError path={Path}", path);
            throw new WebcamProviderException("Falha ao consultar a Windy Webcams.", exception);
        }
    }
}
