namespace TaNoMar.Api.Fishing;

public sealed class FishingOptions
{
    public const string SectionName = "Fishing";

    public string TimeZone { get; set; } = "America/Sao_Paulo";
    public int CacheHours { get; set; } = 6;
    public int MaxStaleHours { get; set; } = 12;
    public bool WarmupEnabled { get; set; } = true;
    public int WarmupIntervalHours { get; set; } = 3;
    public int WarmupStartupDelaySeconds { get; set; } = 10;
    public int RefreshBatchSize { get; set; } = 10;
    public int RefreshConcurrency { get; set; } = 2;
    public int RefreshQueueCapacity { get; set; } = 256;
    public List<FishingLocation> Locations { get; set; } = [];
    public string OpenMeteoWeatherBaseUrl { get; set; } = "https://api.open-meteo.com/v1/forecast";
    public string OpenMeteoGfsBaseUrl { get; set; } = "https://api.open-meteo.com/v1/gfs";
    public string OpenMeteoMarineBaseUrl { get; set; } = "https://marine-api.open-meteo.com/v1/marine";
    public string OpenMeteoApiKey { get; set; } = string.Empty;
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
    public double? SeaOrientationDegrees { get; set; }
    public string Profile { get; set; } = "praia_aberta";
}

public sealed record FishingForecast(
    DateTimeOffset GeneratedAt,
    DateOnly Date,
    IReadOnlyList<FishingLocationForecast> Ranking,
    IReadOnlyList<FishingForecastError> Errors,
    DateTimeOffset? DataUpdatedAt = null,
    bool HasStaleData = false,
    ForecastQualityContext? QualityContext = null);

public sealed record ForecastQualityContext(
    IReadOnlyDictionary<string, ForecastSnapshotMetadata> Snapshots,
    TimeSpan RefreshAfter,
    TimeSpan MaxStale,
    DateTimeOffset EvaluatedAt);

public sealed record ForecastSnapshotMetadata(
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt);

public sealed record FishingLocationForecast(
    string Id,
    string Location,
    DateOnly Date,
    double? Score,
    IReadOnlyList<FishingHourForecast> BestHours,
    FishingHourForecast? BestHour,
    IReadOnlyList<FishingHourForecast> Hours,
    IReadOnlyList<FishingTidePoint>? TidePoints = null,
    IReadOnlyList<FishingTideExtreme>? TideExtremes = null,
    string? TideAttribution = null,
    int? DataQualityVersion = null);

public sealed record ScoringDataCompleteness(int ValidHours)
{
    public const int ExpectedHourCount = 16;

    public int ExpectedHours => ExpectedHourCount;

    public double Ratio => (double)ValidHours / ExpectedHours;

    public static ScoringDataCompleteness FromForecast(FishingLocationForecast forecast)
    {
        var validSlots = forecast.Hours
            .Where(hour => IsExpectedSlot(hour.Time)
                && hour.ScoreAvailability == FishingScoreAvailability.Available
                && hour.Score is not null)
            .Select(hour => hour.Time)
            .ToHashSet(StringComparer.Ordinal);

        return new ScoringDataCompleteness(validSlots.Count);
    }

    private static bool IsExpectedSlot(string time)
        => time is "05:00" or "06:00" or "07:00" or "08:00"
            or "09:00" or "10:00" or "11:00" or "12:00"
            or "13:00" or "14:00" or "15:00" or "16:00"
            or "17:00" or "18:00" or "19:00" or "20:00";
}

public static class FishingForecastDataQuality
{
    public const int CurrentVersion = 1;

    public static FishingForecastDataQualityState State(int? version) => version switch
    {
        CurrentVersion => FishingForecastDataQualityState.Current,
        null or < CurrentVersion => FishingForecastDataQualityState.Legacy,
        _ => FishingForecastDataQualityState.Incompatible
    };

    public static bool IsCurrent(FishingLocationForecast forecast)
        => State(forecast.DataQualityVersion) == FishingForecastDataQualityState.Current;
}

public enum FishingForecastDataQualityState
{
    Current,
    Legacy,
    Incompatible
}

public sealed record FishingTidePoint(string Time, double Height);

public sealed record FishingTideExtreme(string Time, string Type, double HeightMeters);

public sealed record FishingHourForecast(
    string Time,
    double? Score,
    double? WindSpeedKmh,
    double? WindGustKmh,
    string WindDirection,
    double? RainMm,
    double AirTemperatureC,
    double WaterTemperatureC,
    int? RainProbability,
    int? RainProbabilityBestMatch,
    int? RainProbabilityGfs,
    double? WaveMeters,
    double? WavePeriodSeconds,
    double SwellMeters,
    double SwellPeriodSeconds,
    string WaveDirection,
    string SwellDirection,
    double? SeaLevelHeightMsl,
    double PressureHpa,
    string WindOrigin = "",
    double? WindDirectionDegrees = null,
    double? OceanCurrentVelocityKmh = null,
    double? OceanCurrentDirectionDegrees = null,
    FishingScoreAvailability ScoreAvailability = FishingScoreAvailability.Available,
    IReadOnlyList<string>? ScoreMissingReasons = null);

public enum FishingScoreAvailability
{
    Available,
    Unavailable
}

public sealed record FishingScoreResult(
    double? Score,
    FishingScoreAvailability Availability,
    IReadOnlyList<string> MissingReasons);

public sealed record FishingForecastError(string Location, string Error);

public sealed record ForecastRefreshSnapshot(
    IReadOnlyList<string> PendingSpotIds,
    IReadOnlyList<string> FailedSpotIds);
