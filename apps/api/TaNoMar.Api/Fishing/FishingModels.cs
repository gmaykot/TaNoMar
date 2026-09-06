namespace TaNoMar.Api.Fishing;

public sealed class FishingOptions
{
    public const string SectionName = "Fishing";

    public string TimeZone { get; set; } = "America/Sao_Paulo";
    public int CacheHours { get; set; } = 24;
    public bool WarmupEnabled { get; set; } = true;
    public int WarmupIntervalHours { get; set; } = 3;
    public int WarmupStartupDelaySeconds { get; set; } = 10;
    public List<FishingLocation> Locations { get; set; } = [];
    public string TabuaMareBaseUrl { get; set; } = "https://tabuamare.api.br/api/v2";
    public string TabuaMareApiKey { get; set; } = string.Empty;
    public string GeoapifyApiKey { get; set; } = string.Empty;
}

public sealed class FishingLocation
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double SeaOrientationDegrees { get; set; }
    public string Profile { get; set; } = "praia_aberta";
}

public sealed record FishingForecast(
    DateTimeOffset GeneratedAt,
    DateOnly Date,
    IReadOnlyList<FishingLocationForecast> Ranking,
    IReadOnlyList<FishingForecastError> Errors);

public sealed record FishingLocationForecast(
    string Id,
    string Location,
    DateOnly Date,
    double Score,
    IReadOnlyList<FishingHourForecast> BestHours,
    FishingHourForecast? BestHour,
    IReadOnlyList<FishingHourForecast> Hours,
    IReadOnlyList<FishingTidePoint>? TidePoints = null,
    IReadOnlyList<FishingTideExtreme>? TideExtremes = null,
    string? TideAttribution = null);

public sealed record FishingTidePoint(string Time, double Height);

public sealed record FishingTideExtreme(string Time, string Type, double HeightMeters);

public sealed record FishingHourForecast(
    string Time,
    double Score,
    double WindSpeedKmh,
    double WindGustKmh,
    string WindDirection,
    double RainMm,
    double AirTemperatureC,
    double WaterTemperatureC,
    int RainProbability,
    int RainProbabilityBestMatch,
    int RainProbabilityGfs,
    double WaveMeters,
    double WavePeriodSeconds,
    double SwellMeters,
    double SwellPeriodSeconds,
    string WaveDirection,
    string SwellDirection,
    double? SeaLevelHeightMsl,
    double PressureHpa);

public sealed record FishingForecastError(string Location, string Error);

public sealed record ForecastWarmupResult(int Locations, int Refreshed, int Reused, int Failed);
