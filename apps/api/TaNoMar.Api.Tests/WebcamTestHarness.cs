using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using TaNoMar.Api.Data;
using TaNoMar.Api.Webcams;

namespace TaNoMar.Api.Tests;

internal static class WebcamTestHarness
{
    public static TaNoMarDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<TaNoMarDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new TaNoMarDbContext(options);
        db.Plans.AddRange(
            Plan(PlanRules.Free, "Free", live: false),
            Plan(PlanRules.Arrais, "Arrais", live: false),
            Plan(PlanRules.Mestre, "Mestre", live: false),
            Plan(PlanRules.Capitao, "Capitão", live: true));
        db.SaveChanges();
        return db;
    }

    public static WebcamService CreateService(TaNoMarDbContext db, IWebcamProvider provider, WebcamOptions? options = null)
    {
        return new WebcamService(
            db,
            provider,
            new MemoryCache(new MemoryCacheOptions()),
            Microsoft.Extensions.Options.Options.Create(options ?? new WebcamOptions { WindyApiKey = "test", SearchRadiusKm = 10, AvailabilityCacheMinutes = 15 }),
            new TestHostEnvironment(),
            NullLogger<WebcamService>.Instance);
    }

    public static User User(string planCode, string role = "User") => new()
    {
        Id = Guid.NewGuid(),
        Name = planCode,
        Email = $"{planCode}-{Guid.NewGuid():N}@local.test",
        GoogleSubject = Guid.NewGuid().ToString("N"),
        PlanCode = planCode,
        Role = role
    };

    public static FishingSpot Official(string slug = "campeche") => new(slug, "Campeche", "Sul da ilha", -27.65407, -48.46908, 110, "praia_aberta");

    public static FishingSpot Personal(User owner, string slug)
    {
        var spot = new FishingSpot(slug, slug, "Sul da ilha", -27.65407, -48.46908, 110, "praia_aberta")
        {
            Visibility = "private",
            OwnerUserId = owner.Id,
            Type = "personalizado"
        };
        return spot;
    }

    public static WebcamProviderDetails LiveDetails(string externalId = "123456", string name = "Campeche") =>
        new(WebcamOptions.WindyProviderId, externalId, name, -27.654, -48.469, true, true, "https://webcams.windy.com/embed/123456/live", "https://images.windy.com/preview.jpg");

    public static WebcamSearchHit LiveHit(string externalId = "123456", string name = "Campeche", double distance = 1.2) =>
        new(WebcamOptions.WindyProviderId, externalId, name, -27.654, -48.469, distance, true, true, "https://images.windy.com/preview.jpg");

    private static Plan Plan(string code, string name, bool live) => new()
    {
        Id = Guid.NewGuid(),
        Code = code,
        Name = name,
        Tagline = name,
        CanLiveWebcams = live,
        MaxForecastDays = 3,
        MaxFavorites = 0,
        MaxPersonalSpots = 1,
        MaxAlerts = 0
    };
}

internal sealed class FakeWebcamProvider : IWebcamProvider
{
    public string ProviderId => WebcamOptions.WindyProviderId;
    public bool IsConfigured { get; set; } = true;
    public List<WebcamSearchHit> SearchResults { get; } = [];
    public Dictionary<string, WebcamProviderDetails?> Details { get; } = new(StringComparer.Ordinal);
    public Exception? SearchError { get; set; }
    public Exception? GetError { get; set; }
    public int SearchCalls { get; private set; }
    public int GetCalls { get; private set; }

    public Task<IReadOnlyList<WebcamSearchHit>> SearchNearbyAsync(
        double latitude,
        double longitude,
        double radiusKm,
        CancellationToken cancellationToken)
    {
        SearchCalls++;
        if (!IsConfigured) throw new WebcamNotConfiguredException();
        if (SearchError is not null) throw SearchError;
        return Task.FromResult<IReadOnlyList<WebcamSearchHit>>(SearchResults);
    }

    public Task<WebcamProviderDetails?> GetAsync(string externalId, CancellationToken cancellationToken)
    {
        GetCalls++;
        if (!IsConfigured) throw new WebcamNotConfiguredException();
        if (GetError is not null) throw GetError;
        return Task.FromResult(Details.TryGetValue(externalId, out var details) ? details : null);
    }
}

internal sealed class TestHostEnvironment : IHostEnvironment
{
    public string EnvironmentName { get; set; } = Environments.Development;
    public string ApplicationName { get; set; } = "TaNoMar.Api.Tests";
    public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
}
