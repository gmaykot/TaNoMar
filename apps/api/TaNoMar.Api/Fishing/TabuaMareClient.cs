using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace TaNoMar.Api.Fishing;

internal sealed class TabuaMareClient(
    HttpClient httpClient,
    IMemoryCache cache,
    IOptions<FishingOptions> options,
    ILogger<TabuaMareClient> logger)
{
    private static readonly SemaphoreSlim Gate = new(1, 1);

    public async Task<TabuaMareDay?> GetDayAsync(
        double latitude,
        double longitude,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        var harbor = await GetHarborAsync(latitude, longitude, cancellationToken);
        if (harbor is null) return null;

        var month = await GetMonthAsync(harbor.Id, date.Year, date.Month, cancellationToken);
        if (month is null || !month.Days.TryGetValue(date.Day, out var samples) || samples.Count == 0)
            return null;

        return new TabuaMareDay(
            harbor.Name,
            samples,
            TideCurve.ExtremesFromHeights(samples),
            $"Tábua de {FormatHarbor(harbor.Name)}. Fonte: Marinha (Tábua de Maré API).");
    }

    private async Task<TabuaMareHarbor?> GetHarborAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken)
    {
        var key = $"tabuamare:harbor:{latitude.ToString("0.00", CultureInfo.InvariantCulture)}:{longitude.ToString("0.00", CultureInfo.InvariantCulture)}";
        if (cache.TryGetValue(key, out TabuaMareHarbor? cached) && cached is not null)
            return cached;

        var coords = $"[{latitude.ToString(CultureInfo.InvariantCulture)},{longitude.ToString(CultureInfo.InvariantCulture)}]";
        var path = $"nearest-harbor-independent-state/{Uri.EscapeDataString(coords)}";
        var response = await GetAsync<TabuaMareList<TabuaMareHarborDto>>(path, cancellationToken);
        var dto = response?.Data.FirstOrDefault();
        if (dto is null || string.IsNullOrWhiteSpace(dto.Id))
            return null;

        var harbor = new TabuaMareHarbor(dto.Id, dto.HarborName ?? dto.Id);
        cache.Set(key, harbor, TimeSpan.FromHours(Math.Max(options.Value.CacheHours, 24)));
        return harbor;
    }

    private async Task<TabuaMareMonth?> GetMonthAsync(
        string harborId,
        int year,
        int month,
        CancellationToken cancellationToken)
    {
        var key = $"tabuamare:month:{harborId}:{year:0000}-{month:00}";
        if (cache.TryGetValue(key, out TabuaMareMonth? cached) && cached is not null)
            return cached;

        var path = $"tabua-mare/{Uri.EscapeDataString(harborId)}/{month}/{Uri.EscapeDataString("[1-31]")}";
        var response = await GetAsync<TabuaMareList<TabuaMareTableDto>>(path, cancellationToken);
        var table = response?.Data.FirstOrDefault();
        if (table is null || (table.Year != 0 && table.Year != year))
            return null;
        var monthDto = table.Months.FirstOrDefault(item => item.Month == month);
        if (monthDto is null) return null;

        var days = monthDto.Days.ToDictionary(
            day => day.Day,
            day => (IReadOnlyList<(string Time, double Height)>)day.Hours
                .Select(hour => (Clock(hour.Hour), hour.Level))
                .Where(item => item.Item1.Length > 0)
                .ToList());
        var parsed = new TabuaMareMonth(days);
        cache.Set(key, parsed, TimeSpan.FromHours(Math.Max(options.Value.CacheHours, 24)));
        return parsed;
    }

    private async Task<T?> GetAsync<T>(string relativePath, CancellationToken cancellationToken)
    {
        await Gate.WaitAsync(cancellationToken);
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, Combine(relativePath));
            if (!string.IsNullOrWhiteSpace(options.Value.TabuaMareApiKey))
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.Value.TabuaMareApiKey);

            using var response = await httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Tábua de Maré API recusou {Path}: {Status}.", relativePath, (int)response.StatusCode);
                return default;
            }

            return await response.Content.ReadFromJsonAsync<T>(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Falha ao consultar Tábua de Maré API em {Path}.", relativePath);
            return default;
        }
        finally
        {
            Gate.Release();
        }
    }

    private Uri Combine(string relativePath)
    {
        var root = options.Value.TabuaMareBaseUrl.TrimEnd('/') + "/";
        return new Uri(new Uri(root), relativePath);
    }

    private static string Clock(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length < 5) return string.Empty;
        return value[..5];
    }

    private static string FormatHarbor(string name)
    {
        var text = name.Trim();
        var start = text.IndexOf("PORTO DE ", StringComparison.OrdinalIgnoreCase);
        if (start >= 0) text = text[(start + "PORTO DE ".Length)..];
        var paren = text.IndexOf(" (", StringComparison.Ordinal);
        if (paren > 0) text = text[..paren];
        if (string.Equals(text, text.ToUpperInvariant(), StringComparison.Ordinal))
            text = CultureInfo.GetCultureInfo("pt-BR").TextInfo.ToTitleCase(text.ToLower(CultureInfo.GetCultureInfo("pt-BR")));
        return text;
    }
}

internal sealed record TabuaMareDay(
    string HarborName,
    IReadOnlyList<(string Time, double Height)> Points,
    IReadOnlyList<TideExtremePoint> Extremes,
    string Attribution);

internal sealed record TabuaMareHarbor(string Id, string Name);

internal sealed record TabuaMareMonth(IReadOnlyDictionary<int, IReadOnlyList<(string Time, double Height)>> Days);

internal sealed class TabuaMareList<T>
{
    [JsonPropertyName("data")]
    public List<T> Data { get; init; } = [];
}

internal sealed class TabuaMareHarborDto
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("harbor_name")]
    public string? HarborName { get; init; }
}

internal sealed class TabuaMareTableDto
{
    [JsonPropertyName("year")]
    public int Year { get; init; }

    [JsonPropertyName("harbor_name")]
    public string? HarborName { get; init; }

    [JsonPropertyName("months")]
    public List<TabuaMareMonthDto> Months { get; init; } = [];
}

internal sealed class TabuaMareMonthDto
{
    [JsonPropertyName("month")]
    public int Month { get; init; }

    [JsonPropertyName("days")]
    public List<TabuaMareDayDto> Days { get; init; } = [];
}

internal sealed class TabuaMareDayDto
{
    [JsonPropertyName("day")]
    public int Day { get; init; }

    [JsonPropertyName("hours")]
    public List<TabuaMareHourDto> Hours { get; init; } = [];
}

internal sealed class TabuaMareHourDto
{
    [JsonPropertyName("hour")]
    public string Hour { get; init; } = string.Empty;

    [JsonPropertyName("level")]
    public double Level { get; init; }
}
