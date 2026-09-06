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
    private readonly TimeZoneInfo _timeZone;

    public FishingForecastService(
        IOptions<FishingOptions> options,
        FishingForecastCache cache,
        OpenMeteoClient openMeteo,
        TabuaMareClient tabuaMare,
        TaNoMarDbContext db)
    {
        _options = options.Value;
        _cache = cache;
        _openMeteo = openMeteo;
        _tabuaMare = tabuaMare;
        _db = db;
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
            .Where(spot => spot.Visibility == "official" || (spot.Visibility == "shared" && spot.IsApproved) || (userId.HasValue && spot.OwnerUserId == userId.Value));
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
                results.Add(await _cache.GetOrCreateAsync(
                    location,
                    targetDate,
                    token => AnalyzeAsync(location, targetDate, day, token),
                    cancellationToken));
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
        var forecast = await _cache.GetOrCreateAsync(
            location,
            date,
            token => AnalyzeAsync(location, date, day, token),
            cancellationToken);
        if (HasTide(forecast)) return forecast;

        var withTide = await WithTideAsync(location, date, forecast, cancellationToken);
        if (HasTide(withTide))
            await _cache.PutAsync(location.Id, date, withTide, cancellationToken);
        return withTide;
    }

    public async Task<ForecastWarmupResult> WarmPublicSpotsAsync(CancellationToken cancellationToken)
    {
        var today = Today();
        var locations = await _db.FishingSpots
            .AsNoTracking()
            .Where(spot => spot.Visibility == "official" || (spot.Visibility == "shared" && spot.IsApproved))
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

    private async Task<bool> WarmLocationAsync(
        FishingLocation location,
        DateOnly today,
        CancellationToken cancellationToken)
    {
        var missingHours = 0;
        for (var day = 0; day <= 7; day++)
        {
            var date = today.AddDays(day);
            var existing = await _cache.TryGetFreshAsync(location.Id, date, cancellationToken);
            if (existing is null)
            {
                missingHours++;
                continue;
            }

            if (!HasTide(existing))
            {
                var withTide = await WithTideAsync(location, date, existing, cancellationToken);
                if (HasTide(withTide))
                    await _cache.PutAsync(location.Id, date, withTide, cancellationToken);
            }
        }

        if (missingHours == 0)
            return false;

        var weather = await _openMeteo.GetWeatherAsync(location, _options.TimeZone, 8, cancellationToken);
        var gfsRain = await _openMeteo.GetGfsRainAsync(location, _options.TimeZone, 8, cancellationToken);
        var marine = await _openMeteo.GetMarineAsync(location, _options.TimeZone, 8, cancellationToken);

        for (var day = 0; day <= 7; day++)
        {
            var date = today.AddDays(day);
            if (await _cache.HasFreshAsync(location.Id, date, cancellationToken))
                continue;
            var forecast = await WithTideAsync(location, date, BuildForecast(location, date, weather, gfsRain, marine), cancellationToken);
            await _cache.PutAsync(location.Id, date, forecast, cancellationToken);
        }

        return true;
    }

    private async Task<FishingLocationForecast> AnalyzeAsync(
        FishingLocation location,
        DateOnly targetDate,
        int dayOffset,
        CancellationToken cancellationToken)
    {
        var forecastDays = Math.Min(8, Math.Max(2, dayOffset + 1));
        var weather = await _openMeteo.GetWeatherAsync(location, _options.TimeZone, forecastDays, cancellationToken);
        var gfsRain = await _openMeteo.GetGfsRainAsync(location, _options.TimeZone, forecastDays, cancellationToken);
        var marine = await _openMeteo.GetMarineAsync(location, _options.TimeZone, forecastDays, cancellationToken);
        return await WithTideAsync(location, targetDate, BuildForecast(location, targetDate, weather, gfsRain, marine), cancellationToken);
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
                Round(pressure, 0)));
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
