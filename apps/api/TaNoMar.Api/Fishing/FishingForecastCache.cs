using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using TaNoMar.Api.Data;

namespace TaNoMar.Api.Fishing;

internal sealed class FishingForecastCache
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();
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
        _lifetime = TimeSpan.FromHours(options.Value.CacheHours);
    }

    public async Task<bool> HasFreshAsync(string locationId, DateOnly date, CancellationToken cancellationToken)
    {
        var key = MemoryKey(locationId, date);
        if (TryGetMemory(key, out var cached) && IsFresh(cached))
            return true;

        cached = await TryReadSnapshotAsync(locationId, date, cancellationToken);
        if (cached is null || !IsFresh(cached))
            return false;

        SetMemory(key, cached);
        return true;
    }

    public async Task PutAsync(
        string locationId,
        DateOnly date,
        FishingLocationForecast forecast,
        CancellationToken cancellationToken)
    {
        var key = MemoryKey(locationId, date);
        var gate = _locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            SetMemory(key, forecast);
            await SaveSnapshotAsync(locationId, date, forecast, cancellationToken);
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task<FishingLocationForecast> GetOrCreateAsync(
        FishingLocation location,
        DateOnly date,
        Func<CancellationToken, Task<FishingLocationForecast>> factory,
        CancellationToken cancellationToken)
    {
        var key = MemoryKey(location.Id, date);
        if (TryGetMemory(key, out var cached) && IsFresh(cached))
            return cached;

        var gate = _locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            if (TryGetMemory(key, out cached) && IsFresh(cached))
                return cached;

            cached = await TryReadSnapshotAsync(location.Id, date, cancellationToken);
            if (cached is not null && IsFresh(cached))
            {
                SetMemory(key, cached);
                return cached;
            }

            var result = await factory(cancellationToken);
            SetMemory(key, result);
            await SaveSnapshotAsync(location.Id, date, result, cancellationToken);
            return result;
        }
        finally
        {
            gate.Release();
        }
    }

    private static string MemoryKey(string locationId, DateOnly date)
        => $"{locationId}_{date:yyyy-MM-dd}";

    // Maré ausente é lacuna da Open-Meteo, não motivo para ignorar memória/snapshot.
    private static bool IsFresh(FishingLocationForecast forecast)
        => forecast.Hours is { Count: > 0 };

    private bool TryGetMemory(string key, out FishingLocationForecast cached)
    {
        if (_cache.TryGetValue(key, out FishingLocationForecast? value) && value is not null)
        {
            cached = value;
            return true;
        }

        cached = null!;
        return false;
    }

    private void SetMemory(string key, FishingLocationForecast forecast)
        => _cache.Set(key, forecast, _lifetime);

    private async Task<FishingLocationForecast?> TryReadSnapshotAsync(
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

            return JsonSerializer.Deserialize<FishingLocationForecast>(row.PayloadJson, JsonOptions);
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

    private async Task SaveSnapshotAsync(
        string locationId,
        DateOnly date,
        FishingLocationForecast forecast,
        CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            var now = DateTimeOffset.UtcNow;
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
                    CreatedAt = now,
                    ExpiresAt = now + _lifetime
                });
            }
            else
            {
                existing.PayloadJson = payload;
                existing.CreatedAt = now;
                existing.ExpiresAt = now + _lifetime;
            }

            await db.SaveChangesAsync(cancellationToken);
            await db.FishingForecastSnapshots
                .Where(snapshot => snapshot.ExpiresAt < now)
                .ExecuteDeleteAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Falha ao gravar snapshot de previsão {LocationId} {Date}.", locationId, date);
        }
    }
}
