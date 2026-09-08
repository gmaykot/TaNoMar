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
        var videoId = YouTubeWebcamMapper.TryParseVideoId(query);
        if (videoId is not null)
        {
            var dto = await FetchVideoAsync(videoId, cancellationToken);
            var details = YouTubeWebcamMapper.ToDetails(dto, latitude, longitude);
            if (details?.IsUsable == true)
                return [YouTubeWebcamMapper.ToSearchHit(details, latitude, longitude)];

            var channelId = YouTubeWebcamMapper.TryNormalizeChannelId(dto?.Snippet?.ChannelId);
            if (channelId is null) return [];
            if (environment.IsDevelopment())
                logger.LogInformation(
                    "WebcamLookup fallback channel={ChannelId} video={VideoId}",
                    channelId,
                    videoId);
            return await LookupChannelLivesAsync(channelId, latitude, longitude, cancellationToken);
        }

        var channelIdFromQuery = YouTubeWebcamMapper.TryParseChannelId(query)
            ?? await ResolveChannelIdAsync(query, cancellationToken);
        if (string.IsNullOrWhiteSpace(channelIdFromQuery)) return [];
        return await LookupChannelLivesAsync(channelIdFromQuery, latitude, longitude, cancellationToken);
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
        var details = YouTubeWebcamMapper.ToDetails(await FetchVideoAsync(videoId, cancellationToken), latitude, longitude);
        if (environment.IsDevelopment())
            logger.LogInformation(
                "WebcamGet provider=youtube externalId={ExternalId} valid={Valid} live={Live} hasPlayer={HasPlayer}",
                videoId,
                details?.IsUsable == true,
                details?.IsLive == true,
                details?.HasPlayer == true);
        return details;
    }

    private async Task<IReadOnlyList<WebcamSearchHit>> LookupChannelLivesAsync(
        string channelId,
        double latitude,
        double longitude,
        CancellationToken cancellationToken)
    {
        var videoIds = await SearchChannelLiveIdsAsync(channelId, cancellationToken);
        if (videoIds.Count == 0) return [];
        var videos = await FetchVideosAsync(videoIds, cancellationToken);
        return videos
            .Select(item => YouTubeWebcamMapper.ToDetails(item, latitude, longitude))
            .Where(details => details?.IsUsable == true)
            .Select(details => YouTubeWebcamMapper.ToSearchHit(details!, latitude, longitude))
            .ToArray();
    }

    private async Task<IReadOnlyList<string>> SearchChannelLiveIdsAsync(string channelId, CancellationToken cancellationToken)
    {
        var limit = Math.Clamp(options.Value.EffectiveSearchLimit, 1, 25);
        var path = $"search?part=snippet&channelId={Uri.EscapeDataString(channelId)}&eventType=live&type=video&maxResults={limit}";
        var payload = await GetStringAsync(path, cancellationToken, allowNotFound: true);
        if (payload is null) return [];
        try
        {
            return YouTubeWebcamMapper.ParseSearchVideoIds(payload);
        }
        catch (JsonException exception)
        {
            logger.LogError(exception, "WebcamProviderError json action=search provider=youtube");
            throw new WebcamProviderException("Resposta inválida da YouTube Data API.", exception);
        }
    }

    private async Task<YouTubeVideoDto?> FetchVideoAsync(string videoId, CancellationToken cancellationToken)
    {
        var videos = await FetchVideosAsync([videoId], cancellationToken);
        return videos.Count > 0 ? videos[0] : null;
    }

    private async Task<IReadOnlyList<YouTubeVideoDto>> FetchVideosAsync(
        IReadOnlyList<string> videoIds,
        CancellationToken cancellationToken)
    {
        if (videoIds.Count == 0) return [];
        var ids = string.Join(',', videoIds.Select(Uri.EscapeDataString));
        var path = $"videos?part=snippet,status&id={ids}";
        var payload = await GetStringAsync(path, cancellationToken, allowNotFound: true);
        if (payload is null) return [];
        try
        {
            return YouTubeWebcamMapper.ParseVideos(payload);
        }
        catch (JsonException exception)
        {
            logger.LogError(exception, "WebcamProviderError json action=get provider=youtube");
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
