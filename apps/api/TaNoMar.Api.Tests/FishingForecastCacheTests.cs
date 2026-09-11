using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using TaNoMar.Api.Data;
using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class FishingForecastCacheTests
{
    [Fact]
    public async Task Serves_unexpired_snapshot_and_marks_it_stale_after_refresh_interval()
    {
        using var harness = new CacheHarness();
        var date = new DateOnly(2026, 9, 9);
        await harness.SeedSnapshotAsync("campeche", date, Forecast("campeche", date), createdAt: DateTimeOffset.UtcNow.AddHours(-4), expiresAt: DateTimeOffset.UtcNow.AddHours(20));

        var cached = await harness.Cache.TryGetUsableAsync("campeche", date, CancellationToken.None);

        Assert.NotNull(cached);
        Assert.True(cached.IsUsable(DateTimeOffset.UtcNow));
        Assert.True(cached.IsStale(harness.Cache.RefreshAfter, DateTimeOffset.UtcNow));
        Assert.Equal(8.1, cached.Forecast.Score);
    }

    [Fact]
    public async Task Ignores_expired_snapshot_even_when_it_has_hours()
    {
        using var harness = new CacheHarness();
        var date = new DateOnly(2026, 9, 9);
        await harness.SeedSnapshotAsync("campeche", date, Forecast("campeche", date), createdAt: DateTimeOffset.UtcNow.AddHours(-25), expiresAt: DateTimeOffset.UtcNow.AddMinutes(-1));

        var cached = await harness.Cache.TryGetUsableAsync("campeche", date, CancellationToken.None);

        Assert.Null(cached);
    }

    [Fact]
    public async Task Serves_expired_snapshot_within_max_stale_window()
    {
        using var harness = new CacheHarness(cacheHours: 6, maxStaleHours: 12);
        var date = new DateOnly(2026, 9, 9);
        await harness.SeedSnapshotAsync("campeche", date, Forecast("campeche", date), createdAt: DateTimeOffset.UtcNow.AddHours(-8), expiresAt: DateTimeOffset.UtcNow.AddHours(-2));

        var cached = await harness.Cache.TryGetAvailableAsync("campeche", date, CancellationToken.None);

        Assert.NotNull(cached);
        Assert.False(cached.IsUsable(DateTimeOffset.UtcNow));
        Assert.True(cached.IsAvailable(harness.Cache.MaxStale, DateTimeOffset.UtcNow));
    }

    [Fact]
    public async Task Completing_tide_does_not_reset_weather_lifetime()
    {
        using var harness = new CacheHarness();
        var date = new DateOnly(2026, 9, 9);
        var createdAt = DateTimeOffset.UtcNow.AddHours(-2);
        var expiresAt = createdAt.AddHours(24);
        await harness.SeedSnapshotAsync("campeche", date, Forecast("campeche", date), createdAt, expiresAt);

        var withTide = Forecast("campeche", date) with
        {
            TidePoints = [new FishingTidePoint("06:00", 0.4)],
            TideExtremes = [new FishingTideExtreme("06:12", "high", 0.8)]
        };
        await harness.Cache.PutAsync("campeche", date, withTide, CancellationToken.None, resetLifetime: false);

        var row = await harness.ReadSnapshotAsync("campeche", date);
        Assert.NotNull(row);
        Assert.Equal(createdAt, row.CreatedAt);
        Assert.Equal(expiresAt, row.ExpiresAt);
        var cached = await harness.Cache.TryGetUsableAsync("campeche", date, CancellationToken.None);
        Assert.NotNull(cached?.Forecast.TideExtremes);
        Assert.Single(cached.Forecast.TideExtremes);
    }

    [Fact]
    public async Task Refreshing_weather_resets_lifetime()
    {
        using var harness = new CacheHarness();
        var date = new DateOnly(2026, 9, 9);
        var createdAt = DateTimeOffset.UtcNow.AddHours(-5);
        await harness.SeedSnapshotAsync("campeche", date, Forecast("campeche", date), createdAt, createdAt.AddHours(24));

        await harness.Cache.PutAsync("campeche", date, Forecast("campeche", date, 9.2), CancellationToken.None);

        var row = await harness.ReadSnapshotAsync("campeche", date);
        Assert.NotNull(row);
        Assert.True(row.CreatedAt > createdAt.AddHours(4));
        Assert.True(row.ExpiresAt > DateTimeOffset.UtcNow.AddHours(20));
    }

    [Fact]
    public async Task Persists_multiple_locations_and_days_in_one_batch()
    {
        using var harness = new CacheHarness();
        var firstDay = new DateOnly(2026, 9, 9);
        var secondDay = firstDay.AddDays(1);

        await harness.Cache.PutBatchAsync(
            new Dictionary<string, IReadOnlyList<FishingLocationForecast>>
            {
                ["campeche"] = [Forecast("campeche", firstDay), Forecast("campeche", secondDay)],
                ["armacao"] = [Forecast("armacao", firstDay)]
            },
            CancellationToken.None);

        Assert.NotNull(await harness.ReadSnapshotAsync("campeche", firstDay));
        Assert.NotNull(await harness.ReadSnapshotAsync("campeche", secondDay));
        Assert.NotNull(await harness.ReadSnapshotAsync("armacao", firstDay));
    }

    [Fact]
    public async Task Invalidate_removes_memory_and_snapshots_and_bumps_generation()
    {
        using var harness = new CacheHarness();
        var date = new DateOnly(2026, 9, 9);
        await harness.Cache.PutAsync("campeche", date, Forecast("campeche", date), CancellationToken.None);
        var generation = harness.Cache.Generation("campeche");

        await harness.Cache.InvalidateLocationAsync("campeche", CancellationToken.None);

        Assert.Null(await harness.Cache.TryGetUsableAsync("campeche", date, CancellationToken.None));
        Assert.Null(await harness.ReadSnapshotAsync("campeche", date));
        Assert.False(harness.Cache.IsCurrentGeneration("campeche", generation));
    }

    [Fact]
    public void Refresh_interval_follows_warmup_hours()
    {
        using var harness = new CacheHarness(cacheHours: 24, warmupIntervalHours: 3);
        Assert.Equal(TimeSpan.FromHours(3), harness.Cache.RefreshAfter);
    }

    [Fact]
    public async Task Needs_external_refresh_only_when_missing_unusable_or_stale()
    {
        using var harness = new CacheHarness(cacheHours: 24, warmupIntervalHours: 3, maxStaleHours: 24);
        var date = new DateOnly(2026, 9, 9);
        Assert.True(harness.Cache.NeedsExternalRefresh(null));

        await harness.SeedSnapshotAsync("campeche", date, Forecast("campeche", date), createdAt: DateTimeOffset.UtcNow.AddHours(-1), expiresAt: DateTimeOffset.UtcNow.AddHours(23));
        var fresh = await harness.Cache.TryGetUsableAsync("campeche", date, CancellationToken.None);
        Assert.False(harness.Cache.NeedsExternalRefresh(fresh));

        await harness.SeedSnapshotAsync("joaquina", date, Forecast("joaquina", date), createdAt: DateTimeOffset.UtcNow.AddHours(-4), expiresAt: DateTimeOffset.UtcNow.AddHours(20));
        var stale = await harness.Cache.TryGetUsableAsync("joaquina", date, CancellationToken.None);
        Assert.True(harness.Cache.NeedsExternalRefresh(stale));
    }

    [Fact]
    public async Task Loads_available_weeks_in_one_pass_and_hydrates_memory()
    {
        using var harness = new CacheHarness();
        var today = new DateOnly(2026, 9, 9);
        await harness.SeedSnapshotAsync("campeche", today, Forecast("campeche", today), DateTimeOffset.UtcNow.AddHours(-1), DateTimeOffset.UtcNow.AddHours(23));
        await harness.SeedSnapshotAsync("campeche", today.AddDays(1), Forecast("campeche", today.AddDays(1)), DateTimeOffset.UtcNow.AddHours(-1), DateTimeOffset.UtcNow.AddHours(23));

        var weeks = await harness.Cache.GetAvailableWeeksAsync(["campeche"], today, CancellationToken.None);

        Assert.Equal(2, weeks["campeche"].Count);
        Assert.NotNull(await harness.Cache.TryGetUsableAsync("campeche", today, CancellationToken.None));
        Assert.NotNull(await harness.Cache.TryGetUsableAsync("campeche", today.AddDays(1), CancellationToken.None));
    }

    [Fact]
    public void Forecast_inputs_change_when_coordinates_orientation_or_profile_change()
    {
        var spot = new FishingSpot("praia-mole", "Praia Mole", "leste", -27.6, -48.4, 90, "praia_aberta");

        Assert.False(SpotRules.ForecastInputsChanged(spot, -27.6, -48.4, 90, "praia_aberta"));
        Assert.True(SpotRules.ForecastInputsChanged(spot, -27.61, -48.4, 90, "praia_aberta"));
        Assert.True(SpotRules.ForecastInputsChanged(spot, -27.6, -48.41, 90, "praia_aberta"));
        Assert.True(SpotRules.ForecastInputsChanged(spot, -27.6, -48.4, 180, "praia_aberta"));
        Assert.True(SpotRules.ForecastInputsChanged(spot, -27.6, -48.4, 90, "praia_protegida"));
    }

    private static FishingLocationForecast Forecast(string id, DateOnly date, double score = 8.1)
    {
        var hour = new FishingHourForecast(
            "06:00",
            score,
            8,
            12,
            "Nordeste",
            0,
            20,
            19,
            10,
            10,
            8,
            0.8,
            8,
            0.6,
            10,
            "Leste",
            "Leste",
            null,
            1013,
            "mar");
        return new FishingLocationForecast(id, id, date, score, [hour], hour, [hour]);
    }

    private sealed class CacheHarness : IDisposable
    {
        private readonly ServiceProvider _provider;

        public CacheHarness(int cacheHours = 24, int warmupIntervalHours = 3, int maxStaleHours = 24)
        {
            var services = new ServiceCollection();
            var databaseName = Guid.NewGuid().ToString();
            services.AddDbContext<TaNoMarDbContext>(options =>
                options.UseInMemoryDatabase(databaseName));
            _provider = services.BuildServiceProvider();
            Cache = new FishingForecastCache(
                new MemoryCache(new MemoryCacheOptions()),
                _provider.GetRequiredService<IServiceScopeFactory>(),
                Microsoft.Extensions.Options.Options.Create(new FishingOptions
                {
                    CacheHours = cacheHours,
                    MaxStaleHours = maxStaleHours,
                    WarmupIntervalHours = warmupIntervalHours
                }),
                NullLogger<FishingForecastCache>.Instance);
        }

        public FishingForecastCache Cache { get; }

        public async Task SeedSnapshotAsync(
            string locationId,
            DateOnly date,
            FishingLocationForecast forecast,
            DateTimeOffset createdAt,
            DateTimeOffset expiresAt)
        {
            await using var scope = _provider.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            db.FishingForecastSnapshots.Add(new FishingForecastSnapshot
            {
                LocationId = locationId,
                Date = date,
                PayloadJson = System.Text.Json.JsonSerializer.Serialize(forecast, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)),
                CreatedAt = createdAt,
                ExpiresAt = expiresAt
            });
            await db.SaveChangesAsync();
        }

        public async Task<FishingForecastSnapshot?> ReadSnapshotAsync(string locationId, DateOnly date)
        {
            await using var scope = _provider.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            return await db.FishingForecastSnapshots
                .AsNoTracking()
                .SingleOrDefaultAsync(item => item.LocationId == locationId && item.Date == date);
        }

        public void Dispose() => _provider.Dispose();
    }
}
