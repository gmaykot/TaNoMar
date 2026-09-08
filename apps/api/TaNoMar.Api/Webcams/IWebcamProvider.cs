namespace TaNoMar.Api.Webcams;

internal interface IWebcamProvider
{
    string ProviderId { get; }
    bool IsConfigured { get; }

    Task<IReadOnlyList<WebcamSearchHit>> SearchNearbyAsync(
        double latitude,
        double longitude,
        double radiusKm,
        CancellationToken cancellationToken);

    Task<WebcamProviderDetails?> GetAsync(
        string externalId,
        CancellationToken cancellationToken);
}
