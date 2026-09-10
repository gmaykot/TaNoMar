using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using TaNoMar.Api.Data;

namespace TaNoMar.Api.Fishing;

internal sealed class FishingForecastService
{
    private readonly FishingOptions _options;
    private readonly FishingForecastCache _cache;
    private readonly OpenMeteoClient _openMeteo;
    private readonly TabuaMareClient _tabuaMare;
    private readonly TaNoMarDbContext _db;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<FishingForecastService> _logger;
    private readonly TimeZoneInfo _timeZone;

    public FishingForecastService(
        IOptions<FishingOptions> options,
        FishingForecastCache cache,
        OpenMeteoClient openMeteo,
        TabuaMareClient tabuaMare,
        TaNoMarDbContext db,
        IServiceScopeFactory scopeFactory,
        ILogger<FishingForecastService> logger)
    {
        _options = options.Value;
        _cache = cache;
        _openMeteo = openMeteo;
        _tabuaMare = tabuaMare;
        _db = db;
        _scopeFactory = scopeFactory;
        _logger = logger;
        _timeZone = TimeZoneInfo.FindSystemTimeZoneById(_options.TimeZone);
    }

    public async Task<FishingForecast> GetAsync(
        int day,
        CancellationToken cancellationToken,
        Guid? userId = null,
        IReadOnlySet<string>? onlySlugs = null)
    {
        if (day is < 0 or > 7)
            throw new ArgumentOutOfRangeException(nameof(day), "Fishing day must be between 0 and 7.");

        var now = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, _timeZone);
        var targetDate = DateOnly.FromDateTime(now.DateTime).AddDays(day);
        var results = new List<FishingLocationForecast>();
        var errors = new List<FishingForecastError>();

        if (onlySlugs is { Count: 0 })
            return new FishingForecast(now, targetDate, results, errors);

        var query = _db.FishingSpots
            .Where(spot =>
                (spot.Visibility == "official" && spot.IsActive && (userId.HasValue || spot.IsFreeDefault))
                || (spot.Visibility == "shared" && spot.IsApproved)
                || (userId.HasValue && spot.OwnerUserId == userId.Value));
        if (onlySlugs is not null)
            query = query.Where(spot => onlySlugs.Contains(spot.Slug));

        var locations = await query
            .Select(spot => new FishingLocation
            {
                Id = spot.Slug,
                Name = spot.Name,
                Latitude = spot.Latitude ?? 0,
                Longitude = spot.Longitude ?? 0,
                SeaOrientationDegrees = spot.SeaOrientationDegrees,
                Profile = spot.Profile
            })
            .ToListAsync(cancellationToken);

        foreach (var location in locations)
        {
            try
            {
                results.Add(await GetCachedForecastAsync(location, targetDate, cancellationToken));
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                errors.Add(new FishingForecastError(location.Name, exception.Message));
            }
        }

        return new FishingForecast(
            now,
            targetDate,
            results.OrderByDescending(result => result.Score).ToList(),
            errors);
    }

    public DateOnly Today()
        => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, _timeZone).DateTime);

    public async Task<FishingLocationForecast?> GetLocationDayAsync(
        FishingLocation location,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        var day = date.DayNumber - Today().DayNumber;
        if (day is < 0 or > 7) return null;
        return await GetCachedForecastAsync(location, date, cancellationToken);
    }

    public async Task<FishingForecastAuditReport?> AuditLocationDayAsync(
        FishingLocation location,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        var day = date.DayNumber - Today().DayNumber;
        if (day is < 0 or > 7) return null;

        var forecastDays = Math.Min(8, Math.Max(2, day + 1));
        var weather = await _openMeteo.GetWeatherAsync(location, _options.TimeZone, forecastDays, cancellationToken);
        var gfsRain = await _openMeteo.GetGfsRainAsync(location, _options.TimeZone, forecastDays, cancellationToken);
        var marine = await _openMeteo.GetMarineAsync(location, _options.TimeZone, forecastDays, cancellationToken);
        var forecast = BuildForecast(location, date, weather, gfsRain, marine);
        return FishingForecastAudit.Run(location, forecast, new FishingForecastAuditSources(weather, gfsRain, marine));
    }

    public async Task<ForecastWarmupResult> WarmPublicSpotsAsync(CancellationToken cancellationToken)
    {
        var today = Today();
        var locations = await _db.FishingSpots
            .AsNoTracking()
            .Where(spot => (spot.Visibility == "official" && spot.IsActive) || (spot.Visibility == "shared" && spot.IsApproved))
            .Select(spot => new FishingLocation
            {
                Id = spot.Slug,
                Name = spot.Name,
                Latitude = spot.Latitude ?? 0,
                Longitude = spot.Longitude ?? 0,
                SeaOrientationDegrees = spot.SeaOrientationDegrees,
                Profile = spot.Profile
            })
            .ToListAsync(cancellationToken);

        var refreshed = 0;
        var reused = 0;
        var failed = 0;

        foreach (var location in locations)
        {
            try
            {
                if (await WarmLocationAsync(location, today, cancellationToken))
                    refreshed++;
                else
                    reused++;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch
            {
                failed++;
            }
        }

        return new ForecastWarmupResult(locations.Count, refreshed, reused, failed);
    }

    public Task<bool> WarmSpotAsync(FishingSpot spot, CancellationToken cancellationToken)
        => WarmLocationAsync(ToFishingLocation(spot), Today(), cancellationToken);

    public static FishingLocation ToFishingLocation(FishingSpot spot) => new()
    {
        Id = spot.Slug,
        Name = spot.Name,
        Latitude = spot.Latitude ?? 0,
        Longitude = spot.Longitude ?? 0,
        SeaOrientationDegrees = spot.SeaOrientationDegrees,
        Profile = spot.Profile
    };

    private async Task<FishingLocationForecast> GetCachedForecastAsync(
        FishingLocation location,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        var cached = await _cache.TryGetUsableAsync(location.Id, date, cancellationToken);
        if (cached is not null)
        {
            if (cached.IsStale(_cache.RefreshAfter, DateTimeOffset.UtcNow))
                ScheduleWeekRefresh(location);
            return await CompleteTideIfNeededAsync(location, date, cached.Forecast, resetLifetime: false, cancellationToken);
        }

        return await _cache.RunExclusiveAsync(location.Id, async token =>
        {
            cached = await _cache.TryGetUsableAsync(location.Id, date, token);
            if (cached is not null)
                return await CompleteTideIfNeededAsync(location, date, cached.Forecast, resetLifetime: false, token);

            await RefreshWeekCoreAsync(location, token);
            cached = await _cache.TryGetUsableAsync(location.Id, date, token);
            return cached?.Forecast
                ?? throw new InvalidOperationException($"Open-Meteo não devolveu horas para {location.Name} em {date:yyyy-MM-dd}.");
        }, cancellationToken);
    }

    private void ScheduleWeekRefresh(FishingLocation location)
    {
        if (!_cache.TryBeginRefresh(location.Id))
            return;

        _ = Task.Run(async () =>
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var fishing = scope.ServiceProvider.GetRequiredService<FishingForecastService>();
                await fishing.RefreshWeekCoreAsync(location, CancellationToken.None);
            }
            catch (Exception exception)
            {
                _logger.LogWarning(exception, "Falha ao renovar previsão em background de {LocationId}.", location.Id);
            }
            finally
            {
                _cache.EndRefresh(location.Id);
            }
        });
    }

    private async Task<bool> WarmLocationAsync(
        FishingLocation location,
        DateOnly today,
        CancellationToken cancellationToken)
    {
        return await _cache.RunExclusiveAsync(location.Id, async token =>
        {
            var now = DateTimeOffset.UtcNow;
            var needsWeather = false;
            for (var day = 0; day <= 7; day++)
            {
                var date = today.AddDays(day);
                var existing = await _cache.TryGetUsableAsync(location.Id, date, token);
                if (existing is null || existing.IsStale(_cache.RefreshAfter, now))
                {
                    needsWeather = true;
                    continue;
                }

                await CompleteTideIfNeededAsync(location, date, existing.Forecast, resetLifetime: false, token);
            }

            if (!needsWeather)
                return false;

            await RefreshWeekCoreAsync(location, token);
            return true;
        }, cancellationToken);
    }

    private async Task RefreshWeekCoreAsync(
        FishingLocation location,
        CancellationToken cancellationToken)
    {
        var generation = _cache.Generation(location.Id);
        var today = Today();
        var weather = await _openMeteo.GetWeatherAsync(location, _options.TimeZone, 8, cancellationToken);
        var gfsRain = await _openMeteo.GetGfsRainAsync(location, _options.TimeZone, 8, cancellationToken);
        var marine = await _openMeteo.GetMarineAsync(location, _options.TimeZone, 8, cancellationToken);

        if (!_cache.IsCurrentGeneration(location.Id, generation))
            return;

        for (var day = 0; day <= 7; day++)
        {
            var date = today.AddDays(day);
            var forecast = BuildForecast(location, date, weather, gfsRain, marine);
            if (forecast.Hours.Count == 0)
                continue;
            var withTide = await WithTideAsync(location, date, forecast, cancellationToken);
            if (!_cache.IsCurrentGeneration(location.Id, generation))
                return;
            await _cache.PutAsync(location.Id, date, withTide, cancellationToken);
        }
    }

    private async Task<FishingLocationForecast> CompleteTideIfNeededAsync(
        FishingLocation location,
        DateOnly date,
        FishingLocationForecast forecast,
        bool resetLifetime,
        CancellationToken cancellationToken)
    {
        if (HasTide(forecast))
            return forecast;

        var withTide = await WithTideAsync(location, date, forecast, cancellationToken);
        if (HasTide(withTide))
            await _cache.PutAsync(location.Id, date, withTide, cancellationToken, resetLifetime);
        return withTide;
    }

    private async Task<FishingLocationForecast> WithTideAsync(
        FishingLocation location,
        DateOnly date,
        FishingLocationForecast forecast,
        CancellationToken cancellationToken)
    {
        if (HasTide(forecast)) return forecast;
        var day = await _tabuaMare.GetDayAsync(location.Latitude, location.Longitude, date, cancellationToken);
        if (day is null) return forecast;
        return forecast with
        {
            TidePoints = day.Points.Select(point => new FishingTidePoint(point.Time, point.Height)).ToList(),
            TideExtremes = day.Extremes.Select(item => new FishingTideExtreme(item.Time, item.Type, item.HeightMeters)).ToList(),
            TideAttribution = day.Attribution
        };
    }

    private static bool HasTide(FishingLocationForecast forecast)
        => forecast.TideExtremes is { Count: > 0 } || forecast.TidePoints is { Count: > 0 };

    private static FishingLocationForecast BuildForecast(
        FishingLocation location,
        DateOnly targetDate,
        OpenMeteoResponse weather,
        OpenMeteoResponse gfsRain,
        OpenMeteoResponse marine)
    {
        var gfsIndexes = IndexTimes(gfsRain.Hourly.Time);
        var marineIndexes = IndexTimes(marine.Hourly.Time);
        var targetIso = targetDate.ToString("yyyy-MM-dd");
        var rows = new List<FishingHourForecast>();

        for (var index = 0; index < weather.Hourly.Time.Count; index++)
        {
            var timestamp = weather.Hourly.Time[index];
            if (!timestamp.StartsWith(targetIso, StringComparison.Ordinal)) continue;

            var hour = int.Parse(timestamp.AsSpan(11, 2));
            var gfsIndex = gfsIndexes.GetValueOrDefault(timestamp, -1);
            var marineIndex = marineIndexes.GetValueOrDefault(timestamp, -1);

            var speed = ValueAt(weather.Hourly.WindSpeed, index);
            var gust = ValueAt(weather.Hourly.WindGusts, index);
            var windDirection = ValueAt(weather.Hourly.WindDirection, index);
            var rainBestMm = ValueAt(weather.Hourly.Precipitation, index);
            var rainBestProbability = ValueAt(weather.Hourly.PrecipitationProbability, index);
            var rainGfsMm = ValueAt(gfsRain.Hourly.Precipitation, gfsIndex);
            var rainGfsProbability = ValueAt(gfsRain.Hourly.PrecipitationProbability, gfsIndex);
            var rainProbability = Math.Max(rainBestProbability, rainGfsProbability);
            var rainMm = Math.Max(rainBestMm, rainGfsMm);
            var waveHeight = ValueAt(marine.Hourly.WaveHeight, marineIndex);
            var waveDirection = ValueAt(marine.Hourly.WaveDirection, marineIndex);
            var wavePeriod = ValueAt(marine.Hourly.WavePeriod, marineIndex);
            var swellHeight = ValueAt(marine.Hourly.SwellHeight, marineIndex);
            var swellDirection = ValueAt(marine.Hourly.SwellDirection, marineIndex);
            var swellPeriod = ValueAt(marine.Hourly.SwellPeriod, marineIndex);
            var airTemperature = ValueAt(weather.Hourly.Temperature, index);
            var waterTemperature = ValueAt(marine.Hourly.WaterTemperature, marineIndex);
            var seaLevel = ValueAtOrNull(marine.Hourly.SeaLevelHeightMsl, marineIndex);
            var pressure = ValueAt(weather.Hourly.PressureMsl, index);

            var score = FishingScoreCalculator.Calculate(
                speed,
                gust,
                windDirection,
                location.SeaOrientationDegrees,
                waveHeight,
                wavePeriod,
                rainProbability,
                rainMm,
                hour,
                location.Profile);

            rows.Add(new FishingHourForecast(
                $"{hour:00}:00",
                score,
                Round(speed, 1),
                Round(gust, 1),
                CompassDirection(windDirection),
                Round(rainMm, 1),
                Round(airTemperature, 1),
                Round(waterTemperature, 1),
                Convert.ToInt32(Math.Round(rainProbability, MidpointRounding.ToEven)),
                Convert.ToInt32(Math.Round(rainBestProbability, MidpointRounding.ToEven)),
                Convert.ToInt32(Math.Round(rainGfsProbability, MidpointRounding.ToEven)),
                Round(waveHeight, 2),
                Round(wavePeriod, 1),
                Round(swellHeight, 2),
                Round(swellPeriod, 1),
                CompassDirection(waveDirection),
                CompassDirection(swellDirection),
                seaLevel is null ? null : Round(seaLevel.Value, 2),
                Round(pressure, 0),
                FishingScoreCalculator.WindOrigin(windDirection, location.SeaOrientationDegrees),
                windDirection));
        }

        var bestHours = rows
            .Where(row => int.Parse(row.Time.AsSpan(0, 2)) is >= 5 and <= 20)
            .OrderByDescending(row => row.Score)
            .ThenBy(row => row.Time, StringComparer.Ordinal)
            .Take(3)
            .ToList();
        var locationScore = bestHours.Count > 0
            ? Round(bestHours.Average(row => row.Score), 1)
            : 0.0;

        return new FishingLocationForecast(
            location.Id,
            location.Name,
            targetDate,
            locationScore,
            bestHours,
            bestHours.FirstOrDefault(),
            rows);
    }

    private static Dictionary<string, int> IndexTimes(IReadOnlyList<string> times)
        => times.Select((time, index) => (time, index))
            .ToDictionary(item => item.time, item => item.index, StringComparer.Ordinal);

    private static double ValueAt(IReadOnlyList<double?> values, int index)
        => index >= 0 && index < values.Count ? values[index] ?? 0.0 : 0.0;

    private static double? ValueAtOrNull(IReadOnlyList<double?> values, int index)
        => index >= 0 && index < values.Count ? values[index] : null;

    private static double Round(double value, int digits)
        => Math.Round(value, digits, MidpointRounding.ToEven);

    private static string CompassDirection(double degrees)
    {
        string[] names = ["Norte", "Nordeste", "Leste", "Sudeste", "Sul", "Sudoeste", "Oeste", "Noroeste"];
        return names[(int)Math.Floor((degrees + 22.5) / 45) % 8];
    }
}
