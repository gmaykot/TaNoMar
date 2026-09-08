using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TaNoMar.Api.Webcams;

internal static class WindyWebcamMapper
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static IReadOnlyList<WindyWebcamDto> ParseList(string json)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        JsonElement webcams;
        if (root.ValueKind == JsonValueKind.Array)
            webcams = root;
        else if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("webcams", out var list))
            webcams = list;
        else
            return [];

        var items = new List<WindyWebcamDto>();
        foreach (var item in webcams.EnumerateArray())
        {
            var mapped = item.Deserialize<WindyWebcamDto>(JsonOptions);
            if (mapped is not null) items.Add(mapped);
        }
        return items;
    }

    public static WindyWebcamDto? ParseOne(string json)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("webcams", out var list)
            && list.ValueKind == JsonValueKind.Array && list.GetArrayLength() > 0)
            return list[0].Deserialize<WindyWebcamDto>(JsonOptions);
        return root.Deserialize<WindyWebcamDto>(JsonOptions);
    }

    public static WebcamProviderDetails? ToDetails(WindyWebcamDto? dto, double originLatitude, double originLongitude)
    {
        if (dto is null) return null;
        var externalId = dto.ExternalId;
        if (string.IsNullOrWhiteSpace(externalId)) return null;
        if (!string.Equals(dto.Status, "active", StringComparison.OrdinalIgnoreCase)) return null;
        var latitude = dto.Location?.Latitude;
        var longitude = dto.Location?.Longitude;
        if (latitude is null || longitude is null) return null;
        var embedUrl = ReadPlayerUrl(dto.Player, "live");
        var isLive = HasLivePlayer(dto.Player);
        var hasPlayer = !string.IsNullOrWhiteSpace(embedUrl);
        if (!isLive || !hasPlayer) return null;
        var name = string.IsNullOrWhiteSpace(dto.Title) ? $"Câmera {externalId}" : dto.Title.Trim();
        return new WebcamProviderDetails(
            WebcamOptions.WindyProviderId,
            externalId,
            name,
            latitude.Value,
            longitude.Value,
            isLive,
            hasPlayer,
            embedUrl,
            ReadPreview(dto.Images),
            WebcamOptions.WindyDisplayName);
    }

    public static WebcamSearchHit? ToSearchHit(WindyWebcamDto dto, double originLatitude, double originLongitude)
    {
        var details = ToDetails(dto, originLatitude, originLongitude);
        if (details is null || !details.IsUsable) return null;
        return new WebcamSearchHit(
            details.Provider,
            details.ExternalId,
            details.Name,
            details.Latitude,
            details.Longitude,
            WebcamGeo.DistanceKm(originLatitude, originLongitude, details.Latitude, details.Longitude),
            details.IsLive,
            details.HasPlayer,
            details.PreviewUrl,
            details.ProviderDisplayName);
    }

    internal static bool HasLivePlayer(WindyPlayerDto? player)
    {
        if (player?.Live is null || player.Live.Value.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            return false;
        var live = player.Live.Value;
        if (live.ValueKind == JsonValueKind.String)
            return IsHttps(live.GetString());
        if (live.ValueKind != JsonValueKind.Object) return false;
        if (live.TryGetProperty("available", out var available) && available.ValueKind == JsonValueKind.False)
            return false;
        return IsHttps(ReadObjectUrl(live));
    }

    internal static string? ReadPlayerUrl(WindyPlayerDto? player, string timespan)
    {
        if (player is null) return null;
        if (string.Equals(timespan, "live", StringComparison.OrdinalIgnoreCase) && player.Live is JsonElement live)
            return ReadUrl(live);
        if (string.Equals(timespan, "day", StringComparison.OrdinalIgnoreCase) && player.Day is JsonElement day)
            return ReadUrl(day);
        return null;
    }

    private static string? ReadUrl(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.String) return NormalizeHttps(value.GetString());
        if (value.ValueKind == JsonValueKind.Object) return NormalizeHttps(ReadObjectUrl(value));
        return null;
    }

    private static string? ReadObjectUrl(JsonElement value)
    {
        if (value.TryGetProperty("embed", out var embed) && embed.ValueKind == JsonValueKind.String)
            return embed.GetString();
        if (value.TryGetProperty("link", out var link) && link.ValueKind == JsonValueKind.String)
            return link.GetString();
        return null;
    }

    private static string? ReadPreview(WindyImagesDto? images)
    {
        var current = images?.Current;
        return NormalizeHttps(current?.Preview)
            ?? NormalizeHttps(current?.Thumbnail)
            ?? NormalizeHttps(current?.Icon);
    }

    private static string? NormalizeHttps(string? value)
    {
        var trimmed = value?.Trim();
        return IsHttps(trimmed) ? trimmed : null;
    }

    private static bool IsHttps(string? url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps;
}

internal sealed class WindyListResponse
{
    [JsonPropertyName("webcams")]
    public List<WindyWebcamDto>? Webcams { get; set; }
}

internal sealed class WindyWebcamDto
{
    [JsonPropertyName("webcamId")]
    public JsonElement WebcamId { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("location")]
    public WindyLocationDto? Location { get; set; }

    [JsonPropertyName("player")]
    public WindyPlayerDto? Player { get; set; }

    [JsonPropertyName("images")]
    public WindyImagesDto? Images { get; set; }

    public string ExternalId => WebcamId.ValueKind switch
    {
        JsonValueKind.Number when WebcamId.TryGetInt64(out var id) => id.ToString(CultureInfo.InvariantCulture),
        JsonValueKind.String => WebcamId.GetString()?.Trim() ?? string.Empty,
        _ => string.Empty
    };
}

internal sealed class WindyLocationDto
{
    [JsonPropertyName("latitude")]
    public double? Latitude { get; set; }

    [JsonPropertyName("longitude")]
    public double? Longitude { get; set; }
}

internal sealed class WindyPlayerDto
{
    [JsonPropertyName("live")]
    public JsonElement? Live { get; set; }

    [JsonPropertyName("day")]
    public JsonElement? Day { get; set; }
}

internal sealed class WindyImagesDto
{
    [JsonPropertyName("current")]
    public WindyImageSetDto? Current { get; set; }
}

internal sealed class WindyImageSetDto
{
    [JsonPropertyName("icon")]
    public string? Icon { get; set; }

    [JsonPropertyName("thumbnail")]
    public string? Thumbnail { get; set; }

    [JsonPropertyName("preview")]
    public string? Preview { get; set; }
}
