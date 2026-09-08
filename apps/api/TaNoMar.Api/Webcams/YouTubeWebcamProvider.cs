using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace TaNoMar.Api.Webcams;

internal sealed class YouTubeWebcamProvider(
    HttpClient httpClient,
    IOptions<WebcamOptions> options,
    IHostEnvironment environment,
    ILogger<YouTubeWebcamProvider> logger) : IWebcamProvider
{
    public string ProviderId => WebcamOptions.YouTubeProviderId;
    public string DisplayName => WebcamOptions.YouTubeDisplayName;
    public bool IsConfigured => options.Value.IsYouTubeConfigured;

    public Task<IReadOnlyList<WebcamSearchHit>> SearchNearbyAsync(
        double latitude,
        double longitude,
        double radiusKm,
        CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<WebcamSearchHit>>([]);

    public async Task<IReadOnlyList<WebcamSearchHit>> LookupAsync(
        string query,
        double latitude,
        double longitude,
        CancellationToken cancellationToken)
    {
        EnsureConfigured();
        var videoId = YouTubeWebcamMapper.TryParseVideoId(query)
            ?? await ResolveLiveVideoIdAsync(query, cancellationToken);
        if (string.IsNullOrWhiteSpace(videoId)) return [];
        var details = await GetAsync(videoId, latitude, longitude, cancellationToken);
        if (details is null || !details.IsUsable) return [];
        return [YouTubeWebcamMapper.ToSearchHit(details, latitude, longitude)];
    }

    public Task<WebcamProviderDetails?> GetAsync(string externalId, CancellationToken cancellationToken) =>
        GetAsync(externalId, 0, 0, cancellationToken);

    private async Task<WebcamProviderDetails?> GetAsync(
        string externalId,
        double latitude,
        double longitude,
        CancellationToken cancellationToken)
    {
        EnsureConfigured();
        var videoId = YouTubeWebcamMapper.TryParseVideoId(externalId);
        if (videoId is null) return null;
        var path = $"videos?part=snippet,status&id={Uri.EscapeDataString(videoId)}";
        var payload = await GetStringAsync(path, cancellationToken, allowNotFound: true);
        if (payload is null) return null;
        try
        {
            var details = YouTubeWebcamMapper.ToDetails(YouTubeWebcamMapper.ParseVideoList(payload), latitude, longitude);
            if (environment.IsDevelopment())
                logger.LogInformation(
                    "WebcamGet provider=youtube externalId={ExternalId} valid={Valid} live={Live} hasPlayer={HasPlayer}",
                    videoId,
                    details?.IsUsable == true,
                    details?.IsLive == true,
                    details?.HasPlayer == true);
            return details;
        }
        catch (JsonException exception)
        {
            logger.LogError(exception, "WebcamProviderError json action=get provider=youtube");
            throw new WebcamProviderException("Resposta inválida da YouTube Data API.", exception);
        }
    }

    private async Task<string?> ResolveLiveVideoIdAsync(string query, CancellationToken cancellationToken)
    {
        var channelId = YouTubeWebcamMapper.TryParseChannelId(query)
            ?? await ResolveChannelIdAsync(query, cancellationToken);
        if (string.IsNullOrWhiteSpace(channelId)) return null;
        var path = $"search?part=snippet&channelId={Uri.EscapeDataString(channelId)}&eventType=live&type=video&maxResults=1";
        var payload = await GetStringAsync(path, cancellationToken, allowNotFound: true);
        if (payload is null) return null;
        try
        {
            return YouTubeWebcamMapper.ParseSearchVideoId(payload);
        }
        catch (JsonException exception)
        {
            logger.LogError(exception, "WebcamProviderError json action=search provider=youtube");
            throw new WebcamProviderException("Resposta inválida da YouTube Data API.", exception);
        }
    }

    private async Task<string?> ResolveChannelIdAsync(string query, CancellationToken cancellationToken)
    {
        var handle = YouTubeWebcamMapper.TryParseChannelHandle(query);
        if (string.IsNullOrWhiteSpace(handle)) return null;
        var path = $"channels?part=id&forHandle={Uri.EscapeDataString("@" + handle)}";
        var payload = await GetStringAsync(path, cancellationToken, allowNotFound: true);
        if (payload is null) return null;
        try
        {
            return YouTubeWebcamMapper.ParseChannelId(payload);
        }
        catch (JsonException exception)
        {
            logger.LogError(exception, "WebcamProviderError json action=channel provider=youtube");
            throw new WebcamProviderException("Resposta inválida da YouTube Data API.", exception);
        }
    }

    private void EnsureConfigured()
    {
        if (IsConfigured) return;
        if (environment.IsDevelopment())
            logger.LogInformation("YouTube configurado: Não");
        throw new WebcamNotConfiguredException();
    }

    private async Task<string?> GetStringAsync(string path, CancellationToken cancellationToken, bool allowNotFound)
    {
        var separator = path.Contains('?', StringComparison.Ordinal) ? '&' : '?';
        var requestPath = $"{path}{separator}key={Uri.EscapeDataString(options.Value.YouTubeApiKey)}";
        using var request = new HttpRequestMessage(HttpMethod.Get, requestPath);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        try
        {
            using var response = await httpClient.SendAsync(request, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (allowNotFound && response.StatusCode == System.Net.HttpStatusCode.NotFound)
                return null;
            if (!response.IsSuccessStatusCode)
            {
                logger.LogError("WebcamProviderError status={Status} provider=youtube", (int)response.StatusCode);
                throw new WebcamProviderException($"YouTube Data API respondeu {(int)response.StatusCode}.");
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
            logger.LogError(exception, "WebcamProviderError provider=youtube");
            throw new WebcamProviderException("Falha ao consultar a YouTube Data API.", exception);
        }
    }
}
