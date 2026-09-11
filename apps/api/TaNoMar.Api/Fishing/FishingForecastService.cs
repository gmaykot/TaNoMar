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
    private readonly FishingForecastRefreshQueue _refreshQueue;
    private readonly FishingTideEnrichmentQueue _tideQueue;
    private readonly ILogger<FishingForecastService> _logger;
    private readonly TimeZoneInfo _timeZone;

    public FishingForecastService(
        IOptions<FishingOptions> options,
        FishingForecastCache cache,
        OpenMeteoClient openMeteo,
        TabuaMareClient tabuaMare,
        TaNoMarDbContext db,
        FishingForecastRefreshQueue refreshQueue,
        FishingTideEnrichmentQueue tideQueue,
        ILogger<FishingForecastService> logger)
    {
        _options = options.Value;
        _cache = cache;
        _openMeteo = openMeteo;
        _tabuaMare = tabuaMare;
        _db = db;
        _refreshQueue = refreshQueue;
        _tideQueue = tideQueue;
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
                ((spot.Visibility == "official" && spot.IsActive && (userId.HasValue || spot.IsFreeDefault))
                || (spot.Visibility == "shared" && spot.IsApproved)
                || (userId.HasValue && spot.OwnerUserId == userId.Value))
                && spot.Latitude != null
                && spot.Longitude != null);
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

        var cachedByLocation = await _cache.GetAvailableAsync(
            locations.Select(location => location.Id).ToArray(),
            targetDate,
            cancellationToken);
        var dataUpdatedAt = new List<DateTimeOffset>();
        var hasStaleData = false;
        foreach (var location in locations)
        {
            if (!cachedByLocation.TryGetValue(location.Id, out var cached))
            {
                _refreshQueue.Enqueue(location);
                errors.Add(new FishingForecastError(location.Id, "Previsão em atualização."));
                continue;
            }

            var nowUtc = DateTimeOffset.UtcNow;
            var stale = !cached.IsUsable(nowUtc) || cached.IsStale(_cache.RefreshAfter, nowUtc);
            if (stale)
                _refreshQueue.Enqueue(location);
            if (!HasTide(cached.Forecast))
                _tideQueue.Enqueue(location);
            hasStaleData |= stale;
            dataUpdatedAt.Add(cached.CreatedAt);
            results.Add(cached.Forecast);
        }

        return new FishingForecast(
            now,
            targetDate,
            results.OrderByDescending(result => result.Score).ToList(),
            errors,
            dataUpdatedAt.Count > 0 ? dataUpdatedAt.Min() : null,
            hasStaleData);
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
        var weatherTask = _openMeteo.GetWeatherAsync(location, _options.TimeZone, forecastDays, cancellationToken);
        var gfsRainTask = _openMeteo.GetGfsRainAsync(location, _options.TimeZone, forecastDays, cancellationToken);
        var marineTask = _openMeteo.GetMarineAsync(location, _options.TimeZone, forecastDays, cancellationToken);
        await Task.WhenAll(weatherTask, gfsRainTask, marineTask);
        var weather = await weatherTask;
        var gfsRain = await gfsRainTask;
        var marine = await marineTask;
        var forecast = BuildForecast(location, date, weather, gfsRain, marine);
        return FishingForecastAudit.Run(location, forecast, new FishingForecastAuditSources(weather, gfsRain, marine));
    }

    public async Task<(int Locations, int Queued)> QueuePublicSpotsAsync(CancellationToken cancellationToken)
    {
        var locations = await _db.FishingSpots
            .AsNoTracking()
            .Where(spot => ((spot.Visibility == "official" && spot.IsActive) || (spot.Visibility == "shared" && spot.IsApproved))
                && spot.Latitude != null
                && spot.Longitude != null)
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

        await _cache.PruneAsync(cancellationToken);
        if (locations.Count == 0)
            return (0, 0);

        var today = Today();
        var locationIds = locations.Select(location => location.Id).ToArray();
        var todayCachedByLocation = await _cache.GetAvailableAsync(locationIds, today, cancellationToken);
        var weeks = await _cache.GetAvailableWeeksAsync(locationIds, today, cancellationToken);
        var queued = 0;
        foreach (var location in locations)
        {
            todayCachedByLocation.TryGetValue(location.Id, out var todayCached);
            if (_cache.NeedsExternalRefresh(todayCached))
            {
                if (_refreshQueue.Enqueue(location))
                    queued++;
                continue;
            }

            if (!weeks.TryGetValue(location.Id, out var week))
                week = todayCached is null ? [] : [todayCached];
            if (week.Any(item => !HasTide(item.Forecast)))
                _tideQueue.Enqueue(location);
        }

        return (locations.Count, queued);
    }

    public static FishingLocation ToFishingLocation(FishingSpot spot) => new()
    {
        Id = spot.Slug,
        Name = spot.Name,
        Latitude = spot.Latitude ?? 0,
        Longitude = spot.Longitude ?? 0,
        SeaOrientationDegrees = spot.SeaOrientationDegrees,
        Profile = spot.Profile
    };

    public async Task<IReadOnlySet<string>> RefreshBatchAsync(
        IReadOnlyList<FishingLocation> locations,
        CancellationToken cancellationToken)
    {
        if (locations.Count == 0)
            return new HashSet<string>(StringComparer.Ordinal);

        var today = Today();
        var succeeded = new HashSet<string>(StringComparer.Ordinal);
        var toRefresh = new List<FishingLocation>();
        foreach (var location in locations)
        {
            var cached = await _cache.TryGetAvailableAsync(location.Id, today, cancellationToken);
            if (!_cache.NeedsExternalRefresh(cached))
            {
                succeeded.Add(location.Id);
                if (cached is not null && !HasTide(cached.Forecast))
                    _tideQueue.Enqueue(location);
                continue;
            }

            toRefresh.Add(location);
        }

        if (toRefresh.Count == 0)
            return succeeded;

        var generations = toRefresh.ToDictionary(
            location => location.Id,
            location => _cache.Generation(location.Id),
            StringComparer.Ordinal);
        var weatherTask = _openMeteo.GetWeatherBatchAsync(toRefresh, _options.TimeZone, 8, cancellationToken);
        var gfsRainTask = _openMeteo.GetGfsRainBatchAsync(toRefresh, _options.TimeZone, 8, cancellationToken);
        var marineTask = _openMeteo.GetMarineBatchAsync(toRefresh, _options.TimeZone, 8, cancellationToken);
        await Task.WhenAll(weatherTask, gfsRainTask, marineTask);
        var weather = await weatherTask;
        var gfsRain = await gfsRainTask;
        var marine = await marineTask;
        var forecastsByLocation = new Dictionary<string, IReadOnlyList<FishingLocationForecast>>(StringComparer.Ordinal);

        for (var locationIndex = 0; locationIndex < toRefresh.Count; locationIndex++)
        {
            var location = toRefresh[locationIndex];
            if (!_cache.IsCurrentGeneration(location.Id, generations[location.Id]))
                continue;

            var forecasts = new List<FishingLocationForecast>();
            for (var day = 0; day <= 7; day++)
            {
                var forecast = BuildForecast(
                    location,
                    today.AddDays(day),
                    weather[locationIndex],
                    gfsRain[locationIndex],
                    marine[locationIndex]);
                if (forecast.Hours.Count > 0)
                    forecasts.Add(forecast);
            }

            if (forecasts.Count > 0)
                forecastsByLocation[location.Id] = forecasts;
            else
                _logger.LogWarning("Open-Meteo não devolveu horas para {LocationId}.", location.Id);
        }

        await _cache.PutBatchAsync(forecastsByLocation, cancellationToken);
        foreach (var location in toRefresh.Where(location => forecastsByLocation.ContainsKey(location.Id)))
            _tideQueue.Enqueue(location);
        succeeded.UnionWith(forecastsByLocation.Keys);
        return succeeded;
    }

    public async Task EnrichTidesAsync(FishingLocation location, CancellationToken cancellationToken)
    {
        var cachedWeek = await _cache.GetAvailableWeekAsync(location.Id, Today(), cancellationToken);
        var changed = new List<FishingLocationForecast>();
        foreach (var cached in cachedWeek)
        {
            if (HasTide(cached.Forecast))
                continue;
            var withTide = await WithTideAsync(location, cached.Forecast.Date, cached.Forecast, cancellationToken);
            if (HasTide(withTide))
                changed.Add(withTide);
        }

        if (changed.Count > 0)
        {
            await _cache.PutBatchAsync(
                new Dictionary<string, IReadOnlyList<FishingLocationForecast>>(StringComparer.Ordinal)
                {
                    [location.Id] = changed
                },
                cancellationToken,
                resetLifetime: false);
        }
    }

    private async Task<FishingLocationForecast?> GetCachedForecastAsync(
        FishingLocation location,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        var cached = await _cache.TryGetAvailableAsync(location.Id, date, cancellationToken);
        if (cached is null)
        {
            _refreshQueue.Enqueue(location);
            return null;
        }

        var now = DateTimeOffset.UtcNow;
        if (!cached.IsUsable(now) || cached.IsStale(_cache.RefreshAfter, now))
            _refreshQueue.Enqueue(location);
        if (!HasTide(cached.Forecast))
            _tideQueue.Enqueue(location);
        return cached.Forecast;
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
