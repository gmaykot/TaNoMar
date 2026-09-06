using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace TaNoMar.Api.Fishing;

internal sealed class GeoapifyClient(
    HttpClient httpClient,
    IOptions<FishingOptions> options,
    ILogger<GeoapifyClient> logger)
{
    private const string AutocompleteUrl = "https://api.geoapify.com/v1/geocode/autocomplete";
    private const double FlorianopolisLongitude = -48.5482;
    private const double FlorianopolisLatitude = -27.5949;

    public async Task<IReadOnlyList<PlaceSuggestion>> AutocompleteAsync(
        string text,
        CancellationToken cancellationToken)
    {
        var apiKey = options.Value.GeoapifyApiKey;
        if (string.IsNullOrWhiteSpace(apiKey))
            return [];

        var lon = FlorianopolisLongitude.ToString(CultureInfo.InvariantCulture);
        var lat = FlorianopolisLatitude.ToString(CultureInfo.InvariantCulture);
        var query = string.Join("&",
            $"text={Uri.EscapeDataString(text)}",
            "lang=pt",
            "format=json",
            "limit=8",
            "filter=countrycode:br",
            $"bias={Uri.EscapeDataString($"proximity:{lon},{lat}")}",
            $"apiKey={Uri.EscapeDataString(apiKey)}");

        try
        {
            var response = await httpClient.GetFromJsonAsync<GeoapifyAutocompleteResponse>(
                $"{AutocompleteUrl}?{query}",
                cancellationToken);
            return GeoapifyPlaceMapper.Map(response);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            logger.LogWarning(exception, "Geoapify autocomplete falhou.");
            return [];
        }
    }
}
