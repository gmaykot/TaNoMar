using System.Text.Json;
using System.Text.RegularExpressions;

namespace TaNoMar.Api.Webcams;

internal static partial class YouTubeWebcamMapper
{
    private static readonly HashSet<string> Hosts = new(StringComparer.OrdinalIgnoreCase)
    {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtu.be",
        "www.youtu.be",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com"
    };

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static bool LooksLikeYouTubeQuery(string? query)
    {
        var text = query?.Trim();
        if (string.IsNullOrEmpty(text)) return false;
        if (VideoIdPattern().IsMatch(text)) return true;
        return TryCreateUri(text, out var uri) && Hosts.Contains(uri.Host);
    }

    public static string? TryParseVideoId(string? query)
    {
        var text = query?.Trim();
        if (string.IsNullOrEmpty(text)) return null;
        if (VideoIdPattern().IsMatch(text)) return text;
        if (!TryCreateUri(text, out var uri) || !Hosts.Contains(uri.Host)) return null;

        var v = uri.Query.TrimStart('?')
            .Split('&', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(part => part.Split('=', 2))
            .FirstOrDefault(part => part.Length == 2 && part[0].Equals("v", StringComparison.OrdinalIgnoreCase));
        if (v is not null)
        {
            var fromQuery = Uri.UnescapeDataString(v[1]);
            if (VideoIdPattern().IsMatch(fromQuery)) return fromQuery;
        }

        var path = uri.AbsolutePath.Trim('/');
        if (uri.Host.Equals("youtu.be", StringComparison.OrdinalIgnoreCase)
            || uri.Host.Equals("www.youtu.be", StringComparison.OrdinalIgnoreCase))
        {
            var shortId = path.Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            return VideoIdPattern().IsMatch(shortId ?? "") ? shortId : null;
        }

        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length >= 2
            && segments[0] is "embed" or "live" or "shorts" or "v" or "watch"
            && VideoIdPattern().IsMatch(segments[1]))
        {
            return segments[1];
        }

        return null;
    }

    public static string? TryParseChannelHandle(string? query)
    {
        if (!TryYouTubeUri(query, out var uri)) return null;
        var segment = uri.AbsolutePath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        if (string.IsNullOrEmpty(segment) || segment[0] != '@') return null;
        var handle = segment[1..];
        return HandlePattern().IsMatch(handle) ? handle : null;
    }

    public static string? TryParseChannelId(string? query)
    {
        if (!TryYouTubeUri(query, out var uri)) return null;
        var segments = uri.AbsolutePath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length >= 2
            && segments[0].Equals("channel", StringComparison.OrdinalIgnoreCase)
            && ChannelIdPattern().IsMatch(segments[1]))
        {
            return segments[1];
        }

        return null;
    }

    public static string EmbedUrl(string videoId) =>
        $"https://www.youtube.com/embed/{videoId}";

    public static YouTubeVideoDto? ParseVideoList(string json)
    {
        var payload = JsonSerializer.Deserialize<YouTubeListResponse<YouTubeVideoDto>>(json, JsonOptions);
        return payload?.Items is { Length: > 0 } items ? items[0] : null;
    }

    public static string? ParseSearchVideoId(string json)
    {
        var payload = JsonSerializer.Deserialize<YouTubeListResponse<YouTubeSearchDto>>(json, JsonOptions);
        var videoId = payload?.Items is { Length: > 0 } items ? items[0].Id?.VideoId : null;
        return VideoIdPattern().IsMatch(videoId ?? "") ? videoId : null;
    }

    public static string? ParseChannelId(string json)
    {
        var payload = JsonSerializer.Deserialize<YouTubeListResponse<YouTubeChannelDto>>(json, JsonOptions);
        var id = payload?.Items is { Length: > 0 } items ? items[0].Id : null;
        return ChannelIdPattern().IsMatch(id ?? "") ? id : null;
    }

    public static WebcamProviderDetails? ToDetails(YouTubeVideoDto? dto, double latitude, double longitude)
    {
        if (dto is null) return null;
        var externalId = dto.Id?.Trim();
        var name = dto.Snippet?.Title?.Trim();
        if (!VideoIdPattern().IsMatch(externalId ?? "") || string.IsNullOrWhiteSpace(name)) return null;
        var live = string.Equals(dto.Snippet?.LiveBroadcastContent, "live", StringComparison.OrdinalIgnoreCase);
        var embeddable = dto.Status?.Embeddable != false;
        var preview = FirstHttps(
            dto.Snippet?.Thumbnails?.High?.Url,
            dto.Snippet?.Thumbnails?.Medium?.Url,
            dto.Snippet?.Thumbnails?.Default?.Url);
        return new WebcamProviderDetails(
            WebcamOptions.YouTubeProviderId,
            externalId!,
            name,
            latitude,
            longitude,
            live,
            embeddable,
            EmbedUrl(externalId!),
            preview,
            WebcamOptions.YouTubeDisplayName);
    }

    public static WebcamSearchHit ToSearchHit(WebcamProviderDetails details, double latitude, double longitude) =>
        new(
            details.Provider,
            details.ExternalId,
            details.Name,
            latitude,
            longitude,
            0,
            details.IsLive,
            details.HasPlayer,
            details.PreviewUrl,
            details.ProviderDisplayName);

    private static bool TryYouTubeUri(string? query, out Uri uri)
    {
        uri = null!;
        var text = query?.Trim();
        if (string.IsNullOrEmpty(text)) return false;
        return TryCreateUri(text, out uri) && Hosts.Contains(uri.Host);
    }

    private static bool TryCreateUri(string text, out Uri uri)
    {
        if (Uri.TryCreate(text, UriKind.Absolute, out uri!)
            && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp))
        {
            return true;
        }

        return Uri.TryCreate("https://" + text, UriKind.Absolute, out uri!);
    }

    private static string? FirstHttps(params string?[] values)
    {
        foreach (var value in values)
        {
            if (Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps)
                return value;
        }

        return null;
    }

    [GeneratedRegex("^[A-Za-z0-9_-]{11}$", RegexOptions.CultureInvariant)]
    private static partial Regex VideoIdPattern();

    [GeneratedRegex("^UC[A-Za-z0-9_-]{22}$", RegexOptions.CultureInvariant)]
    private static partial Regex ChannelIdPattern();

    [GeneratedRegex("^[A-Za-z0-9._-]{3,30}$", RegexOptions.CultureInvariant)]
    private static partial Regex HandlePattern();
}

internal sealed class YouTubeListResponse<T>
{
    public T[]? Items { get; set; }
}

internal sealed class YouTubeVideoDto
{
    public string? Id { get; set; }
    public YouTubeSnippetDto? Snippet { get; set; }
    public YouTubeStatusDto? Status { get; set; }
}

internal sealed class YouTubeSnippetDto
{
    public string? Title { get; set; }
    public string? LiveBroadcastContent { get; set; }
    public YouTubeThumbnailsDto? Thumbnails { get; set; }
}

internal sealed class YouTubeStatusDto
{
    public bool? Embeddable { get; set; }
}

internal sealed class YouTubeThumbnailsDto
{
    public YouTubeThumbnailDto? Default { get; set; }
    public YouTubeThumbnailDto? Medium { get; set; }
    public YouTubeThumbnailDto? High { get; set; }
}

internal sealed class YouTubeThumbnailDto
{
    public string? Url { get; set; }
}

internal sealed class YouTubeSearchDto
{
    public YouTubeSearchIdDto? Id { get; set; }
}

internal sealed class YouTubeSearchIdDto
{
    public string? VideoId { get; set; }
}

internal sealed class YouTubeChannelDto
{
    public string? Id { get; set; }
}
