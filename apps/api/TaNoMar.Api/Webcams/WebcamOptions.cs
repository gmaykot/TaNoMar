namespace TaNoMar.Api.Webcams;

public sealed class WebcamOptions
{
    public const string SectionName = "Webcams";
    public const string WindyProviderId = "windy";

    public string WindyApiKey { get; set; } = string.Empty;
    public string WindyBaseUrl { get; set; } = "https://api.windy.com/webcams/api/v3/";
    public double SearchRadiusKm { get; set; } = 10;
    public int AvailabilityCacheMinutes { get; set; } = 15;
    public int SearchLimit { get; set; } = 50;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(WindyApiKey);

    public double EffectiveSearchRadiusKm =>
        SearchRadiusKm is < 1 or > 250 ? 10 : SearchRadiusKm;

    public int EffectiveAvailabilityCacheMinutes =>
        AvailabilityCacheMinutes < 1 ? 15 : AvailabilityCacheMinutes;

    public int EffectiveSearchLimit =>
        SearchLimit is < 1 or > 50 ? 50 : SearchLimit;
}
