namespace TaNoMar.Api.Webcams;

/// <summary>
/// Resolve o provider pelo identificador persistido. A pesquisa por proximidade
/// continua na Windy; o admin consulta o YouTube por link. Partner/Custom entram depois.
/// </summary>
internal sealed class WebcamProviderCatalog(IEnumerable<IWebcamProvider> providers)
{
    private readonly IReadOnlyList<IWebcamProvider> _providers = [.. providers];

    public IWebcamProvider? Find(string? providerId)
    {
        if (string.IsNullOrWhiteSpace(providerId)) return null;
        return _providers.FirstOrDefault(item =>
            string.Equals(item.ProviderId, providerId.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    public IWebcamProvider? NearbySearchProvider => Find(WebcamOptions.WindyProviderId);

    public IWebcamProvider? YouTubeProvider => Find(WebcamOptions.YouTubeProviderId);

    public string DisplayName(string? providerId)
    {
        var match = Find(providerId);
        if (match is not null) return match.DisplayName;
        return string.IsNullOrWhiteSpace(providerId) ? string.Empty : providerId.Trim();
    }
}
