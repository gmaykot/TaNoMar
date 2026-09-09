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

    public bool IsStale(TimeSpan refreshAfter, DateTimeOffset now)
        => now - CreatedAt >= refreshAfter;
}

internal sealed class FishingForecastCache
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte>> _keysByLocation = new();
    private readonly ConcurrentDictionary<string, int> _generations = new();
    private readonly ConcurrentDictionary<string, byte> _refreshing = new();
    private readonly IMemoryCache _cache;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<FishingForecastCache> _logger;
    private readonly TimeSpan _lifetime;

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
        var refreshHours = options.Value.WarmupIntervalHours > 0
            ? options.Value.WarmupIntervalHours
            : Math.Max(1, options.Value.CacheHours / 2);
        RefreshAfter = TimeSpan.FromHours(refreshHours);
    }

    public TimeSpan RefreshAfter { get; }

    public int Generation(string locationId)
        => _generations.GetOrAdd(locationId, 0);

    public bool IsCurrentGeneration(string locationId, int generation)
        => Generation(locationId) == generation;

    public bool TryBeginRefresh(string locationId)
        => _refreshing.TryAdd(locationId, 0);

    public void EndRefresh(string locationId)
        => _refreshing.TryRemove(locationId, out _);

    public async Task<T> RunExclusiveAsync<T>(
        string locationId,
        Func<CancellationToken, Task<T>> action,
        CancellationToken cancellationToken)
    {
        var gate = _locks.GetOrAdd(locationId, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            return await action(cancellationToken);
        }
        finally
        {
            gate.Release();
        }
    }

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
            SetMemory(key, locationId, stored, stored.ExpiresAt - now);
        }
        finally
        {
            gate.Release();
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
            var now = DateTimeOffset.UtcNow;
            var row = await db.FishingForecastSnapshots
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    snapshot => snapshot.LocationId == locationId && snapshot.Date == date && snapshot.ExpiresAt > now,
                    cancellationToken);

            if (row is null)
                return null;

            var forecast = JsonSerializer.Deserialize<FishingLocationForecast>(row.PayloadJson, JsonOptions);
            return forecast is null ? null : new CachedForecast(forecast, row.CreatedAt, row.ExpiresAt);
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

            var expired = await db.FishingForecastSnapshots
                .Where(snapshot => snapshot.ExpiresAt < now)
                .ToListAsync(cancellationToken);
            if (expired.Count > 0)
            {
                db.FishingForecastSnapshots.RemoveRange(expired);
                await db.SaveChangesAsync(cancellationToken);
            }
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
}
