using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using TaNoMar.Api.Data;

namespace TaNoMar.Api.Fishing;

internal sealed record CachedForecast(
    FishingLocationForecast Forecast,
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt)
{
    public bool HasHours => Forecast.Hours is { Count: > 0 };

    public bool IsUsable(DateTimeOffset now) => HasHours && ExpiresAt > now;

    public bool IsAvailable(TimeSpan maxStale, DateTimeOffset now)
        => HasHours && CreatedAt + maxStale > now;

    public bool IsStale(TimeSpan refreshAfter, DateTimeOffset now)
        => now - CreatedAt >= refreshAfter;
}

internal sealed class FishingForecastCache
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte>> _keysByLocation = new();
    private readonly ConcurrentDictionary<string, int> _generations = new();
    private readonly IMemoryCache _cache;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<FishingForecastCache> _logger;
    private readonly TimeSpan _lifetime;
    private readonly TimeSpan _maxStale;

    public FishingForecastCache(
        IMemoryCache cache,
        IServiceScopeFactory scopeFactory,
        IOptions<FishingOptions> options,
        ILogger<FishingForecastCache> logger)
    {
        _cache = cache;
        _scopeFactory = scopeFactory;
        _logger = logger;
        _lifetime = TimeSpan.FromHours(Math.Max(1, options.Value.CacheHours));
        _maxStale = TimeSpan.FromHours(Math.Max(options.Value.CacheHours, options.Value.MaxStaleHours));
        var refreshHours = options.Value.WarmupIntervalHours > 0
            ? options.Value.WarmupIntervalHours
            : Math.Max(1, options.Value.CacheHours / 2);
        RefreshAfter = TimeSpan.FromHours(refreshHours);
    }

    public TimeSpan RefreshAfter { get; }

    public TimeSpan MaxStale => _maxStale;

    public bool NeedsExternalRefresh(CachedForecast? cached)
    {
        var now = DateTimeOffset.UtcNow;
        return cached is null
            || !cached.IsAvailable(_maxStale, now)
            || !cached.IsUsable(now)
            || cached.IsStale(RefreshAfter, now);
    }

    public int Generation(string locationId)
        => _generations.GetOrAdd(locationId, 0);

    public bool IsCurrentGeneration(string locationId, int generation)
        => Generation(locationId) == generation;

    public async Task<CachedForecast?> TryGetUsableAsync(
        string locationId,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var key = MemoryKey(locationId, date);
        if (TryGetMemory(key, out var cached) && cached.IsUsable(now))
            return cached;

        cached = await TryReadSnapshotAsync(locationId, date, cancellationToken);
        if (cached is null || !cached.IsUsable(now))
            return null;

        SetMemory(key, locationId, cached, cached.ExpiresAt - now);
        return cached;
    }

    public async Task<CachedForecast?> TryGetAvailableAsync(
        string locationId,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var key = MemoryKey(locationId, date);
        if (TryGetMemory(key, out var cached) && cached.IsAvailable(_maxStale, now))
            return cached;

        cached = await TryReadSnapshotAsync(locationId, date, cancellationToken);
        if (cached is null || !cached.IsAvailable(_maxStale, now))
            return null;

        SetMemory(key, locationId, cached, cached.CreatedAt + _maxStale - now);
        return cached;
    }

    public async Task<IReadOnlyDictionary<string, CachedForecast>> GetAvailableAsync(
        IReadOnlyCollection<string> locationIds,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var result = new Dictionary<string, CachedForecast>(StringComparer.Ordinal);
        var missing = new List<string>();
        foreach (var locationId in locationIds.Distinct(StringComparer.Ordinal))
        {
            var key = MemoryKey(locationId, date);
            if (TryGetMemory(key, out var cached) && cached.IsAvailable(_maxStale, now))
                result[locationId] = cached;
            else
                missing.Add(locationId);
        }

        if (missing.Count == 0)
            return result;

        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            var minimumCreatedAt = now - _maxStale;
            var rows = await db.FishingForecastSnapshots
                .AsNoTracking()
                .Where(snapshot => missing.Contains(snapshot.LocationId)
                    && snapshot.Date == date
                    && snapshot.CreatedAt > minimumCreatedAt)
                .ToListAsync(cancellationToken);
            foreach (var row in rows)
            {
                var cached = Deserialize(row);
                if (cached is null || !cached.IsAvailable(_maxStale, now))
                    continue;
                result[row.LocationId] = cached;
                SetMemory(MemoryKey(row.LocationId, date), row.LocationId, cached, cached.CreatedAt + _maxStale - now);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Falha ao ler snapshots de previsão em lote para {Date}.", date);
        }

        return result;
    }

    public async Task<IReadOnlyList<CachedForecast>> GetAvailableWeekAsync(
        string locationId,
        DateOnly today,
        CancellationToken cancellationToken)
    {
        var dates = Enumerable.Range(0, 8).Select(today.AddDays).ToArray();
        var now = DateTimeOffset.UtcNow;
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            var minimumCreatedAt = now - _maxStale;
            var rows = await db.FishingForecastSnapshots
                .AsNoTracking()
                .Where(snapshot => snapshot.LocationId == locationId
                    && dates.Contains(snapshot.Date)
                    && snapshot.CreatedAt > minimumCreatedAt)
                .OrderBy(snapshot => snapshot.Date)
                .ToListAsync(cancellationToken);
            var week = new List<CachedForecast>();
            foreach (var row in rows)
            {
                var cached = Deserialize(row);
                if (cached is null || !cached.IsAvailable(_maxStale, now))
                    continue;
                week.Add(cached);
                SetMemory(
                    MemoryKey(locationId, cached.Forecast.Date),
                    locationId,
                    cached,
                    cached.CreatedAt + _maxStale - now);
            }

            return week;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Falha ao ler semana de previsão {LocationId}.", locationId);
            return [];
        }
    }

    public async Task<IReadOnlyDictionary<string, IReadOnlyList<CachedForecast>>> GetAvailableWeeksAsync(
        IReadOnlyCollection<string> locationIds,
        DateOnly today,
        CancellationToken cancellationToken)
    {
        var dates = Enumerable.Range(0, 8).Select(today.AddDays).ToArray();
        var now = DateTimeOffset.UtcNow;
        var result = new Dictionary<string, List<CachedForecast>>(StringComparer.Ordinal);
        var missing = new List<string>();
        foreach (var locationId in locationIds.Distinct(StringComparer.Ordinal))
        {
            var week = new List<CachedForecast>(dates.Length);
            var complete = true;
            foreach (var date in dates)
            {
                if (!TryGetMemory(MemoryKey(locationId, date), out var cached) || !cached.IsAvailable(_maxStale, now))
                {
                    complete = false;
                    break;
                }

                week.Add(cached);
            }

            if (complete)
                result[locationId] = week;
            else
                missing.Add(locationId);
        }

        if (missing.Count == 0)
            return ToReadOnlyWeeks(result);

        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            var minimumCreatedAt = now - _maxStale;
            var rows = await db.FishingForecastSnapshots
                .AsNoTracking()
                .Where(snapshot => missing.Contains(snapshot.LocationId)
                    && dates.Contains(snapshot.Date)
                    && snapshot.CreatedAt > minimumCreatedAt)
                .OrderBy(snapshot => snapshot.LocationId)
                .ThenBy(snapshot => snapshot.Date)
                .ToListAsync(cancellationToken);
            foreach (var row in rows)
            {
                var cached = Deserialize(row);
                if (cached is null || !cached.IsAvailable(_maxStale, now))
                    continue;
                if (!result.TryGetValue(row.LocationId, out var week))
                {
                    week = [];
                    result[row.LocationId] = week;
                }

                week.Add(cached);
                SetMemory(
                    MemoryKey(row.LocationId, cached.Forecast.Date),
                    row.LocationId,
                    cached,
                    cached.CreatedAt + _maxStale - now);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Falha ao ler semanas de previsão em lote.");
        }

        return ToReadOnlyWeeks(result);
    }

    private static IReadOnlyDictionary<string, IReadOnlyList<CachedForecast>> ToReadOnlyWeeks(
        Dictionary<string, List<CachedForecast>> source)
    {
        var result = new Dictionary<string, IReadOnlyList<CachedForecast>>(source.Count, StringComparer.Ordinal);
        foreach (var (locationId, week) in source)
            result[locationId] = week;
        return result;
    }

    public async Task PutAsync(
        string locationId,
        DateOnly date,
        FishingLocationForecast forecast,
        CancellationToken cancellationToken,
        bool resetLifetime = true)
    {
        var key = MemoryKey(locationId, date);
        var gate = _locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            var now = DateTimeOffset.UtcNow;
            var stored = await SaveSnapshotAsync(locationId, date, forecast, resetLifetime, now, cancellationToken);
            SetMemory(key, locationId, stored, stored.CreatedAt + _maxStale - now);
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task PutBatchAsync(
        IReadOnlyDictionary<string, IReadOnlyList<FishingLocationForecast>> forecastsByLocation,
        CancellationToken cancellationToken,
        bool resetLifetime = true)
    {
        if (forecastsByLocation.Count == 0)
            return;

        var now = DateTimeOffset.UtcNow;
        var locationIds = forecastsByLocation.Keys.ToArray();
        var dates = forecastsByLocation.Values.SelectMany(items => items.Select(item => item.Date)).Distinct().ToArray();
        var stored = new List<(string LocationId, CachedForecast Cached)>();
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            var existingRows = await db.FishingForecastSnapshots
                .Where(snapshot => locationIds.Contains(snapshot.LocationId) && dates.Contains(snapshot.Date))
                .ToListAsync(cancellationToken);
            var existingByKey = existingRows.ToDictionary(
                row => MemoryKey(row.LocationId, row.Date),
                StringComparer.Ordinal);

            foreach (var (locationId, forecasts) in forecastsByLocation)
            {
                foreach (var forecast in forecasts)
                {
                    var key = MemoryKey(locationId, forecast.Date);
                    var payload = JsonSerializer.Serialize(forecast, JsonOptions);
                    var createdAt = now;
                    var expiresAt = now + _lifetime;
                    if (!existingByKey.TryGetValue(key, out var row))
                    {
                        row = new FishingForecastSnapshot
                        {
                            LocationId = locationId,
                            Date = forecast.Date,
                            CreatedAt = createdAt,
                            ExpiresAt = expiresAt
                        };
                        db.FishingForecastSnapshots.Add(row);
                    }
                    else if (!resetLifetime)
                    {
                        createdAt = row.CreatedAt;
                        expiresAt = row.ExpiresAt;
                    }

                    row.PayloadJson = payload;
                    row.CreatedAt = createdAt;
                    row.ExpiresAt = expiresAt;
                    stored.Add((locationId, new CachedForecast(forecast, createdAt, expiresAt)));
                }
            }

            await db.SaveChangesAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Falha ao gravar {Locations} lotes de snapshots de previsão.", forecastsByLocation.Count);
        }

        foreach (var (locationId, cached) in stored)
            SetMemory(MemoryKey(locationId, cached.Forecast.Date), locationId, cached, cached.CreatedAt + _maxStale - now);
    }

    public async Task PruneAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            var minimumCreatedAt = DateTimeOffset.UtcNow - _maxStale;
            var expired = await db.FishingForecastSnapshots
                .Where(snapshot => snapshot.CreatedAt < minimumCreatedAt)
                .ToListAsync(cancellationToken);
            if (expired.Count == 0)
                return;
            db.FishingForecastSnapshots.RemoveRange(expired);
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Falha ao remover snapshots antigos de previsão.");
        }
    }

    public async Task InvalidateLocationAsync(string locationId, CancellationToken cancellationToken)
    {
        _generations.AddOrUpdate(locationId, 1, (_, current) => current + 1);
        if (_keysByLocation.TryRemove(locationId, out var keys))
        {
            foreach (var key in keys.Keys)
                _cache.Remove(key);
        }

        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            var rows = await db.FishingForecastSnapshots
                .Where(snapshot => snapshot.LocationId == locationId)
                .ToListAsync(cancellationToken);
            if (rows.Count == 0)
                return;

            db.FishingForecastSnapshots.RemoveRange(rows);
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Falha ao invalidar snapshots de previsão {LocationId}.", locationId);
        }
    }

    private static string MemoryKey(string locationId, DateOnly date)
        => $"{locationId}_{date:yyyy-MM-dd}";

    private bool TryGetMemory(string key, out CachedForecast cached)
    {
        if (_cache.TryGetValue(key, out CachedForecast? value) && value is not null)
        {
            cached = value;
            return true;
        }

        cached = null!;
        return false;
    }

    private void SetMemory(string key, string locationId, CachedForecast forecast, TimeSpan lifetime)
    {
        if (lifetime <= TimeSpan.Zero)
        {
            _cache.Remove(key);
            return;
        }

        _cache.Set(key, forecast, lifetime);
        _keysByLocation.GetOrAdd(locationId, _ => new ConcurrentDictionary<string, byte>(StringComparer.Ordinal))
            .TryAdd(key, 0);
    }

    private async Task<CachedForecast?> TryReadSnapshotAsync(
        string locationId,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            var row = await db.FishingForecastSnapshots
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    snapshot => snapshot.LocationId == locationId && snapshot.Date == date,
                    cancellationToken);

            return row is null ? null : Deserialize(row);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Falha ao ler snapshot de previsão {LocationId} {Date}.", locationId, date);
            return null;
        }
    }

    private async Task<CachedForecast> SaveSnapshotAsync(
        string locationId,
        DateOnly date,
        FishingLocationForecast forecast,
        bool resetLifetime,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var createdAt = now;
        var expiresAt = now + _lifetime;

        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            var payload = JsonSerializer.Serialize(forecast, JsonOptions);
            var existing = await db.FishingForecastSnapshots
                .FirstOrDefaultAsync(snapshot => snapshot.LocationId == locationId && snapshot.Date == date, cancellationToken);

            if (existing is null)
            {
                db.FishingForecastSnapshots.Add(new FishingForecastSnapshot
                {
                    LocationId = locationId,
                    Date = date,
                    PayloadJson = payload,
                    CreatedAt = createdAt,
                    ExpiresAt = expiresAt
                });
            }
            else
            {
                existing.PayloadJson = payload;
                if (resetLifetime)
                {
                    existing.CreatedAt = createdAt;
                    existing.ExpiresAt = expiresAt;
                }
                else
                {
                    createdAt = existing.CreatedAt;
                    expiresAt = existing.ExpiresAt;
                }
            }

            await db.SaveChangesAsync(cancellationToken);

        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Falha ao gravar snapshot de previsão {LocationId} {Date}.", locationId, date);
        }

        return new CachedForecast(forecast, createdAt, expiresAt);
    }

    private static CachedForecast? Deserialize(FishingForecastSnapshot row)
    {
        var forecast = JsonSerializer.Deserialize<FishingLocationForecast>(row.PayloadJson, JsonOptions);
        return forecast is null ? null : new CachedForecast(forecast, row.CreatedAt, row.ExpiresAt);
    }
}
