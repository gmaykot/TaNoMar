using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using TaNoMar.Api.Data;
using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class FishingForecastWarmupQueueTests
{
    [Fact]
    public async Task Fresh_snapshot_is_not_queued_for_refresh()
    {
        using var harness = new WarmupHarness();
        await harness.AddOfficialAsync("campeche");
        await harness.SeedTodayAsync("campeche", createdHoursAgo: 1);

        var result = await harness.Fishing.QueuePublicSpotsAsync(CancellationToken.None);

        Assert.Equal(1, result.Locations);
        Assert.Equal(0, result.Queued);
        Assert.Empty(harness.Refresh.Snapshot(["campeche"]).PendingSpotIds);
        Assert.Null(await TryReadTideAsync(harness.Tide));
    }

    [Fact]
    public async Task Missing_or_stale_snapshot_is_queued_for_refresh()
    {
        using var harness = new WarmupHarness();
        await harness.AddOfficialAsync("campeche");
        await harness.AddOfficialAsync("joaquina");
        await harness.SeedTodayAsync("joaquina", createdHoursAgo: 4);

        var result = await harness.Fishing.QueuePublicSpotsAsync(CancellationToken.None);

        Assert.Equal(2, result.Locations);
        Assert.Equal(2, result.Queued);
        Assert.Equal(["campeche", "joaquina"], harness.Refresh.Snapshot(["campeche", "joaquina"]).PendingSpotIds);
        Assert.Null(await TryReadTideAsync(harness.Tide));
    }

    [Fact]
    public async Task Fresh_snapshot_without_tide_only_queues_tide()
    {
        using var harness = new WarmupHarness();
        await harness.AddOfficialAsync("campeche");
        await harness.SeedTodayAsync("campeche", createdHoursAgo: 1, withTide: false);

        var result = await harness.Fishing.QueuePublicSpotsAsync(CancellationToken.None);

        Assert.Equal(0, result.Queued);
        Assert.Empty(harness.Refresh.Snapshot(["campeche"]).PendingSpotIds);
        var tide = await TryReadTideAsync(harness.Tide);
        Assert.Equal("campeche", tide?.Id);
    }

    [Fact]
    public async Task Refresh_batch_skips_open_meteo_when_snapshot_became_fresh()
    {
        using var harness = new WarmupHarness();
        await harness.SeedTodayAsync("campeche", createdHoursAgo: 1, withTide: true);
        var location = new FishingLocation { Id = "campeche", Name = "campeche", Latitude = -27.6, Longitude = -48.4 };

        var succeeded = await harness.Fishing.RefreshBatchAsync([location], CancellationToken.None);

        Assert.Contains("campeche", succeeded);
        Assert.Equal(0, harness.Http.Calls);
        Assert.Null(await TryReadTideAsync(harness.Tide));
    }

    private static async Task<FishingLocation?> TryReadTideAsync(FishingTideEnrichmentQueue queue)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromMilliseconds(50));
        try
        {
            return await queue.ReadAsync(timeout.Token);
        }
        catch (OperationCanceledException)
        {
            return null;
        }
    }

    private sealed class WarmupHarness : IDisposable
    {
        private readonly ServiceProvider _provider;
        private readonly IServiceScope _scope;

        public WarmupHarness()
        {
            var services = new ServiceCollection();
            var databaseName = Guid.NewGuid().ToString();
            services.AddDbContext<TaNoMarDbContext>(options =>
                options.UseInMemoryDatabase(databaseName));
            _provider = services.BuildServiceProvider();
            _scope = _provider.CreateScope();
            var fishingOptions = Microsoft.Extensions.Options.Options.Create(new FishingOptions
            {
                TimeZone = "America/Sao_Paulo",
                CacheHours = 24,
                MaxStaleHours = 24,
                WarmupIntervalHours = 3
            });
            Http = new CountingHandler();
            var httpClient = new HttpClient(Http);
            Cache = new FishingForecastCache(
                new MemoryCache(new MemoryCacheOptions()),
                _provider.GetRequiredService<IServiceScopeFactory>(),
                fishingOptions,
                NullLogger<FishingForecastCache>.Instance);
            Refresh = new FishingForecastRefreshQueue(fishingOptions);
            Tide = new FishingTideEnrichmentQueue(fishingOptions);
            Db = _scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            Fishing = new FishingForecastService(
                fishingOptions,
                Cache,
                new OpenMeteoClient(httpClient, fishingOptions, NullLogger<OpenMeteoClient>.Instance),
                new TabuaMareClient(httpClient, new MemoryCache(new MemoryCacheOptions()), fishingOptions, NullLogger<TabuaMareClient>.Instance),
                Db,
                Refresh,
                Tide,
                NullLogger<FishingForecastService>.Instance);
        }

        public TaNoMarDbContext Db { get; }
        public FishingForecastCache Cache { get; }
        public FishingForecastRefreshQueue Refresh { get; }
        public FishingTideEnrichmentQueue Tide { get; }
        public FishingForecastService Fishing { get; }
        public CountingHandler Http { get; }

        public async Task AddOfficialAsync(string slug)
        {
            await using var scope = _provider.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            db.FishingSpots.Add(new FishingSpot(slug, slug, "sul", -27.6, -48.4, 90, "praia_aberta"));
            await db.SaveChangesAsync();
        }

        public async Task SeedTodayAsync(string locationId, int createdHoursAgo, bool withTide = true)
        {
            var forecast = Forecast(locationId, Fishing.Today());
            if (withTide)
            {
                forecast = forecast with
                {
                    TidePoints = [new FishingTidePoint("06:00", 0.4)],
                    TideExtremes = [new FishingTideExtreme("06:12", "high", 0.8)]
                };
            }

            await using var scope = _provider.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            db.FishingForecastSnapshots.Add(new FishingForecastSnapshot
            {
                LocationId = locationId,
                Date = Fishing.Today(),
                PayloadJson = System.Text.Json.JsonSerializer.Serialize(
                    forecast,
                    new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)),
                CreatedAt = DateTimeOffset.UtcNow.AddHours(-createdHoursAgo),
                ExpiresAt = DateTimeOffset.UtcNow.AddHours(20)
            });
            await db.SaveChangesAsync();
        }

        public void Dispose()
        {
            _scope.Dispose();
            _provider.Dispose();
        }
    }

    private static FishingLocationForecast Forecast(string id, DateOnly date)
    {
        var hour = new FishingHourForecast(
            "06:00",
            8.1,
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
        return new FishingLocationForecast(id, id, date, 8.1, [hour], hour, [hour]);
    }

    private sealed class CountingHandler : HttpMessageHandler
    {
        public int Calls { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.BadGateway));
        }
    }
}
