using System.Net;
using System.Text.Json;
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

    [Fact]
    public async Task Legacy_snapshot_is_unavailable_for_ranking_and_requests_refresh()
    {
        using var harness = new WarmupHarness();
        await harness.AddOfficialAsync("campeche");
        await harness.SeedTodayAsync("campeche", createdHoursAgo: 1, dataQualityVersion: null);

        var result = await harness.Fishing.GetAsync(0, CancellationToken.None);

        Assert.Empty(result.Ranking);
        Assert.Contains(result.Errors, error => error.Location == "campeche");
        Assert.Equal(["campeche"], harness.Refresh.Snapshot(["campeche"]).PendingSpotIds);
    }

    [Fact]
    public async Task Successful_refresh_replaces_legacy_snapshot_with_current_version()
    {
        using var harness = new WarmupHarness();
        await harness.AddOfficialAsync("campeche");
        await harness.SeedTodayAsync("campeche", createdHoursAgo: 1, dataQualityVersion: null);
        harness.Http.UseSuccessfulForecast(harness.Fishing.Today());
        var location = new FishingLocation
        {
            Id = "campeche", Name = "campeche", Latitude = -27.6, Longitude = -48.4,
            SeaOrientationDegrees = 90, Profile = "praia_aberta"
        };

        var succeeded = await harness.Fishing.RefreshBatchAsync([location], CancellationToken.None);
        var result = await harness.Fishing.GetAsync(0, CancellationToken.None);

        Assert.Contains("campeche", succeeded);
        Assert.Equal(FishingForecastDataQuality.CurrentVersion,
            (await harness.Cache.TryGetAvailableAsync("campeche", harness.Fishing.Today(), CancellationToken.None))
                ?.Forecast.DataQualityVersion);
        Assert.Equal("campeche", Assert.Single(result.Ranking).Id);
    }

    [Fact]
    public async Task Get_forecast_transports_snapshot_metadata_without_persisting_quality()
    {
        using var harness = new WarmupHarness();
        await harness.AddOfficialAsync("campeche");
        await harness.SeedTodayAsync("campeche", createdHoursAgo: 1);
        var snapshot = await harness.Db.FishingForecastSnapshots
            .AsNoTracking()
            .SingleAsync(item => item.LocationId == "campeche");

        var result = await harness.Fishing.GetAsync(0, CancellationToken.None);

        var context = Assert.IsType<ForecastQualityContext>(result.QualityContext);
        var metadata = Assert.Single(context.Snapshots).Value;
        Assert.Equal(snapshot.CreatedAt, metadata.CreatedAt);
        Assert.Equal(snapshot.ExpiresAt, metadata.ExpiresAt);
        Assert.Equal(harness.Cache.RefreshAfter, context.RefreshAfter);
        Assert.Equal(harness.Cache.MaxStale, context.MaxStale);
        var payload = JsonSerializer.Deserialize<JsonElement>(snapshot.PayloadJson);
        Assert.False(payload.TryGetProperty("quality", out _));
        Assert.False(payload.TryGetProperty("dataCompleteness", out _));
    }

    [Fact]
    public async Task Get_forecast_projects_runtime_quality_from_snapshot_metadata()
    {
        using var harness = new WarmupHarness();
        await harness.AddOfficialAsync("campeche");
        await harness.SeedTodayAsync("campeche", createdHoursAgo: 1);
        var result = await harness.Fishing.GetAsync(0, CancellationToken.None);
        var createdAt = Assert.IsType<ForecastQualityContext>(result.QualityContext).Snapshots["campeche"].CreatedAt;

        var json = JsonSerializer.SerializeToElement(
            FishingForecastPublicDto.Day(result, createdAt.AddHours(1), false, PlanRules.DefaultBestHoursMode),
            new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var quality = json.GetProperty("ranking")[0].GetProperty("quality");

        Assert.Equal("low", quality.GetProperty("confidence").GetProperty("level").GetString());
        Assert.Equal(3, quality.GetProperty("dataCompleteness").GetProperty("validHours").GetInt32());
        Assert.Equal(16, quality.GetProperty("dataCompleteness").GetProperty("expectedHours").GetInt32());
        Assert.Equal(0.1875, quality.GetProperty("dataCompleteness").GetProperty("ratio").GetDouble());
        Assert.Equal(
            [ForecastConfidenceReasonCodes.SparseHourCoverage],
            quality.GetProperty("confidence").GetProperty("reasons").EnumerateArray().Select(value => value.GetString()));
        Assert.Equal(createdAt, quality.GetProperty("dataUpdatedAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task Location_day_used_by_marine_does_not_embed_quality()
    {
        using var harness = new WarmupHarness();
        await harness.AddOfficialAsync("campeche");
        await harness.SeedTodayAsync("campeche", createdHoursAgo: 1);
        var location = new FishingLocation
        {
            Id = "campeche",
            Name = "campeche",
            Latitude = -27.6,
            Longitude = -48.4,
            SeaOrientationDegrees = 90,
            Profile = "praia_aberta"
        };

        var forecast = await harness.Fishing.GetLocationDayAsync(location, harness.Fishing.Today(), CancellationToken.None);
        var json = JsonSerializer.SerializeToElement(forecast, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.NotNull(forecast);
        Assert.False(json.TryGetProperty("quality", out _));
        Assert.False(json.TryGetProperty("confidence", out _));
        Assert.False(json.TryGetProperty("dataCompleteness", out _));
    }

    [Fact]
    public async Task Failed_refresh_does_not_reuse_legacy_score()
    {
        using var harness = new WarmupHarness();
        await harness.AddOfficialAsync("campeche");
        await harness.SeedTodayAsync("campeche", createdHoursAgo: 1, dataQualityVersion: null);
        var location = new FishingLocation
        {
            Id = "campeche", Name = "campeche", Latitude = -27.6, Longitude = -48.4
        };

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            harness.Fishing.RefreshBatchAsync([location], CancellationToken.None));
        var result = await harness.Fishing.GetAsync(0, CancellationToken.None);

        Assert.Empty(result.Ranking);
        Assert.Contains(result.Errors, error => error.Location == "campeche");
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

        public async Task SeedTodayAsync(
            string locationId,
            int createdHoursAgo,
            bool withTide = true,
            int? dataQualityVersion = FishingForecastDataQuality.CurrentVersion)
        {
            var forecast = Forecast(locationId, Fishing.Today()) with
            {
                DataQualityVersion = dataQualityVersion
            };
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
        var hours = new[]
        {
            hour,
            hour with { Time = "07:00" },
            hour with { Time = "08:00" }
        };
        return new FishingLocationForecast(
            id, id, date, 8.1, hours, hour, hours,
            DataQualityVersion: FishingForecastDataQuality.CurrentVersion);
    }

    private sealed class CountingHandler : HttpMessageHandler
    {
        public int Calls { get; private set; }
        private DateOnly? _successfulDate;

        public void UseSuccessfulForecast(DateOnly date) => _successfulDate = date;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            if (_successfulDate is not DateOnly date)
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.BadGateway));

            var times = Enumerable.Range(6, 3).Select(hour => $"{date:yyyy-MM-dd}T{hour:00}:00").ToArray();
            Dictionary<string, object> hourly;
            var uri = request.RequestUri?.AbsoluteUri ?? string.Empty;
            if (uri.Contains("marine-api", StringComparison.Ordinal))
            {
                hourly = new Dictionary<string, object>
                {
                    ["time"] = times,
                    ["wave_height"] = new[] { 0.8, 0.8, 0.8 },
                    ["wave_direction"] = new[] { 90, 90, 90 },
                    ["wave_period"] = new[] { 8, 8, 8 },
                    ["swell_wave_height"] = new[] { 0.5, 0.5, 0.5 },
                    ["swell_wave_direction"] = new[] { 90, 90, 90 },
                    ["swell_wave_period"] = new[] { 7, 7, 7 },
                    ["sea_surface_temperature"] = new[] { 18, 18, 18 },
                    ["sea_level_height_msl"] = new[] { 0.1, 0.2, 0.3 }
                };
            }
            else if (uri.Contains("/gfs", StringComparison.Ordinal))
            {
                hourly = new Dictionary<string, object>
                {
                    ["time"] = times,
                    ["precipitation_probability"] = new[] { 0, 0, 0 },
                    ["precipitation"] = new[] { 0, 0, 0 }
                };
            }
            else
            {
                hourly = new Dictionary<string, object>
                {
                    ["time"] = times,
                    ["wind_speed_10m"] = new[] { 8, 8, 8 },
                    ["wind_direction_10m"] = new[] { 90, 90, 90 },
                    ["wind_gusts_10m"] = new[] { 10, 10, 10 },
                    ["precipitation"] = new[] { 0, 0, 0 },
                    ["precipitation_probability"] = new[] { 0, 0, 0 },
                    ["temperature_2m"] = new[] { 20, 20, 20 },
                    ["pressure_msl"] = new[] { 1012, 1012, 1012 }
                };
            }

            var payload = System.Text.Json.JsonSerializer.Serialize(new { hourly });

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(payload, System.Text.Encoding.UTF8, "application/json")
            });
        }
    }
}
