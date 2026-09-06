using System.Text.Json.Serialization;

namespace TaNoMar.Api.Fishing;

public sealed record PlaceSuggestion(
    string Name,
    string Formatted,
    string City,
    string State,
    string? Category,
    double Latitude,
    double Longitude);

internal static class GeoapifyPlaceMapper
{
    private static readonly Dictionary<string, string> StateNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["acre"] = "AC",
        ["alagoas"] = "AL",
        ["amapá"] = "AP",
        ["amapa"] = "AP",
        ["amazonas"] = "AM",
        ["bahia"] = "BA",
        ["ceará"] = "CE",
        ["ceara"] = "CE",
        ["distrito federal"] = "DF",
        ["espírito santo"] = "ES",
        ["espirito santo"] = "ES",
        ["goiás"] = "GO",
        ["goias"] = "GO",
        ["maranhão"] = "MA",
        ["maranhao"] = "MA",
        ["mato grosso"] = "MT",
        ["mato grosso do sul"] = "MS",
        ["minas gerais"] = "MG",
        ["pará"] = "PA",
        ["para"] = "PA",
        ["paraíba"] = "PB",
        ["paraiba"] = "PB",
        ["paraná"] = "PR",
        ["parana"] = "PR",
        ["pernambuco"] = "PE",
        ["piauí"] = "PI",
        ["piaui"] = "PI",
        ["rio de janeiro"] = "RJ",
        ["rio grande do norte"] = "RN",
        ["rio grande do sul"] = "RS",
        ["rondônia"] = "RO",
        ["rondonia"] = "RO",
        ["roraima"] = "RR",
        ["santa catarina"] = "SC",
        ["são paulo"] = "SP",
        ["sao paulo"] = "SP",
        ["sergipe"] = "SE",
        ["tocantins"] = "TO"
    };

    public static IReadOnlyList<PlaceSuggestion> Map(GeoapifyAutocompleteResponse? response)
    {
        if (response?.Results is null || response.Results.Count == 0)
            return [];

        var items = new List<PlaceSuggestion>(response.Results.Count);
        foreach (var result in response.Results)
        {
            if (result.Lat is not { } latitude || result.Lon is not { } longitude)
                continue;
            if (!IsFinite(latitude) || !IsFinite(longitude))
                continue;

            var name = FirstNonEmpty(result.Name, result.AddressLine1, result.Formatted);
            if (name is null)
                continue;

            var city = FirstNonEmpty(result.City, result.County, name) ?? name;
            items.Add(new PlaceSuggestion(
                name,
                FirstNonEmpty(result.Formatted, name) ?? name,
                city,
                MapState(result.StateCode, result.State),
                string.IsNullOrWhiteSpace(result.Category) ? null : result.Category.Trim(),
                latitude,
                longitude));
        }

        return items;
    }

    internal static string MapState(string? stateCode, string? state)
    {
        var code = NormalizeStateCode(stateCode);
        if (code is not null)
            return code;

        var name = state?.Trim();
        if (!string.IsNullOrEmpty(name) && StateNames.TryGetValue(name, out var mapped))
            return mapped;

        return "SC";
    }

    private static string? NormalizeStateCode(string? stateCode)
    {
        if (string.IsNullOrWhiteSpace(stateCode))
            return null;

        var trimmed = stateCode.Trim().ToUpperInvariant();
        if (trimmed.StartsWith("BR-", StringComparison.Ordinal) && trimmed.Length >= 5)
            trimmed = trimmed[3..];

        return trimmed.Length == 2 && trimmed.All(char.IsAsciiLetter) ? trimmed : null;
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
                return value.Trim();
        }

        return null;
    }

    private static bool IsFinite(double value)
        => double.IsFinite(value) && !double.IsNaN(value);
}

internal sealed class GeoapifyAutocompleteResponse
{
    [JsonPropertyName("results")]
    public List<GeoapifyPlace> Results { get; init; } = [];
}

internal sealed class GeoapifyPlace
{
    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("formatted")]
    public string? Formatted { get; init; }

    [JsonPropertyName("city")]
    public string? City { get; init; }

    [JsonPropertyName("county")]
    public string? County { get; init; }

    [JsonPropertyName("state")]
    public string? State { get; init; }

    [JsonPropertyName("state_code")]
    public string? StateCode { get; init; }

    [JsonPropertyName("category")]
    public string? Category { get; init; }

    [JsonPropertyName("lat")]
    public double? Lat { get; init; }

    [JsonPropertyName("lon")]
    public double? Lon { get; init; }

    [JsonPropertyName("address_line1")]
    public string? AddressLine1 { get; init; }
}
