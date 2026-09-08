using Microsoft.EntityFrameworkCore;
using TaNoMar.Api.Data;
using TaNoMar.Api.Webcams;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class WebcamServiceTests
{
    [Fact]
    public async Task Admin_pesquisa_cameras()
    {
        using var db = WebcamTestHarness.CreateDb();
        var admin = WebcamTestHarness.User(PlanRules.Mestre, "Admin");
        var spot = WebcamTestHarness.Official();
        db.Users.Add(admin);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var provider = new FakeWebcamProvider();
        provider.SearchResults.Add(WebcamTestHarness.LiveHit());
        var service = WebcamTestHarness.CreateService(db, provider);

        var result = await service.SearchAsync(admin, spot.Slug, asAdmin: true, CancellationToken.None);

        Assert.Equal(200, result.Status);
        Assert.Equal(1, provider.SearchCalls);
    }

    [Fact]
    public async Task Admin_vincula_camera()
    {
        using var db = WebcamTestHarness.CreateDb();
        var admin = WebcamTestHarness.User(PlanRules.Mestre, "Admin");
        var spot = WebcamTestHarness.Official();
        db.Users.Add(admin);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var provider = new FakeWebcamProvider();
        provider.Details["123456"] = WebcamTestHarness.LiveDetails();
        var service = WebcamTestHarness.CreateService(db, provider);

        var result = await service.LinkAsync(admin, spot.Slug, new WebcamLinkRequest("windy", "123456"), asAdmin: true, CancellationToken.None);

        Assert.Equal(200, result.Status);
        Assert.Equal(1, await db.FishingSpotWebcams.CountAsync(item => item.IsActive));
    }

    [Fact]
    public async Task Admin_remove_camera()
    {
        using var db = WebcamTestHarness.CreateDb();
        var admin = WebcamTestHarness.User(PlanRules.Mestre, "Admin");
        var spot = WebcamTestHarness.Official();
        db.Users.Add(admin);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        db.FishingSpotWebcams.Add(new FishingSpotWebcam
        {
            FishingSpotId = spot.Id,
            Provider = "windy",
            ExternalId = "123456",
            Name = "Campeche",
            CreatedByUserId = admin.Id
        });
        await db.SaveChangesAsync();
        var service = WebcamTestHarness.CreateService(db, new FakeWebcamProvider());

        var result = await service.UnlinkAsync(admin, spot.Slug, asAdmin: true, CancellationToken.None);

        Assert.Equal(204, result.Status);
        Assert.Equal(0, await db.FishingSpotWebcams.CountAsync(item => item.IsActive));
    }

    [Fact]
    public async Task Capitao_acessa_camera()
    {
        using var db = WebcamTestHarness.CreateDb();
        var user = WebcamTestHarness.User(PlanRules.Capitao);
        var spot = WebcamTestHarness.Official();
        db.Users.Add(user);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        db.FishingSpotWebcams.Add(new FishingSpotWebcam
        {
            FishingSpotId = spot.Id,
            Provider = "windy",
            ExternalId = "123456",
            Name = "Campeche",
            IsAvailable = true,
            LastAvailabilityCheck = DateTimeOffset.UtcNow,
            CreatedByUserId = user.Id
        });
        await db.SaveChangesAsync();
        var provider = new FakeWebcamProvider();
        provider.Details["123456"] = WebcamTestHarness.LiveDetails();
        var service = WebcamTestHarness.CreateService(db, provider);

        var result = await service.ViewAsync(user, spot.Slug, CancellationToken.None);

        Assert.Equal(200, result.Status);
        Assert.Contains("embedUrl", Body(result));
    }

    [Fact]
    public async Task Free_recebe_403_sem_url()
    {
        using var db = WebcamTestHarness.CreateDb();
        var user = WebcamTestHarness.User(PlanRules.Free);
        var spot = WebcamTestHarness.Official();
        db.Users.Add(user);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        db.FishingSpotWebcams.Add(new FishingSpotWebcam
        {
            FishingSpotId = spot.Id,
            Provider = "windy",
            ExternalId = "123456",
            Name = "Campeche",
            CreatedByUserId = user.Id
        });
        await db.SaveChangesAsync();
        var provider = new FakeWebcamProvider();
        provider.Details["123456"] = WebcamTestHarness.LiveDetails();
        var service = WebcamTestHarness.CreateService(db, provider);

        var result = await service.ViewAsync(user, spot.Slug, CancellationToken.None);

        Assert.Equal(403, result.Status);
        Assert.DoesNotContain("embedUrl", Body(result));
        Assert.DoesNotContain("123456", Body(result));
        Assert.Equal(0, provider.GetCalls);
    }

    [Fact]
    public async Task Capitao_pesquisa_meu_local_proprio()
    {
        using var db = WebcamTestHarness.CreateDb();
        var user = WebcamTestHarness.User(PlanRules.Capitao);
        var spot = WebcamTestHarness.Personal(user, "meu-local");
        db.Users.Add(user);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var provider = new FakeWebcamProvider();
        provider.SearchResults.Add(WebcamTestHarness.LiveHit());
        var service = WebcamTestHarness.CreateService(db, provider);

        var result = await service.SearchAsync(user, spot.Slug, asAdmin: false, CancellationToken.None);

        Assert.Equal(200, result.Status);
    }

    [Fact]
    public async Task Capitao_vincula_meu_local_proprio()
    {
        using var db = WebcamTestHarness.CreateDb();
        var user = WebcamTestHarness.User(PlanRules.Capitao);
        var spot = WebcamTestHarness.Personal(user, "meu-local");
        db.Users.Add(user);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var provider = new FakeWebcamProvider();
        provider.Details["123456"] = WebcamTestHarness.LiveDetails();
        var service = WebcamTestHarness.CreateService(db, provider);

        var result = await service.LinkAsync(user, spot.Slug, new WebcamLinkRequest("windy", "123456"), asAdmin: false, CancellationToken.None);

        Assert.Equal(200, result.Status);
        Assert.Equal(1, await db.FishingSpotWebcams.CountAsync(item => item.FishingSpotId == spot.Id && item.IsActive));
    }

    [Fact]
    public async Task Capitao_nao_vincula_meu_local_de_outro()
    {
        using var db = WebcamTestHarness.CreateDb();
        var owner = WebcamTestHarness.User(PlanRules.Capitao);
        var other = WebcamTestHarness.User(PlanRules.Capitao);
        var spot = WebcamTestHarness.Personal(owner, "local-alheio");
        db.Users.AddRange(owner, other);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var provider = new FakeWebcamProvider();
        provider.Details["123456"] = WebcamTestHarness.LiveDetails();
        var service = WebcamTestHarness.CreateService(db, provider);

        var result = await service.LinkAsync(other, spot.Slug, new WebcamLinkRequest("windy", "123456"), asAdmin: false, CancellationToken.None);

        Assert.Equal(403, result.Status);
        Assert.Equal(0, await db.FishingSpotWebcams.CountAsync());
        Assert.Equal(0, provider.GetCalls);
    }

    [Fact]
    public async Task Free_nao_pesquisa_meu_local()
    {
        using var db = WebcamTestHarness.CreateDb();
        var user = WebcamTestHarness.User(PlanRules.Free);
        var spot = WebcamTestHarness.Personal(user, "meu-local");
        db.Users.Add(user);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var provider = new FakeWebcamProvider();
        provider.SearchResults.Add(WebcamTestHarness.LiveHit());
        var service = WebcamTestHarness.CreateService(db, provider);

        var result = await service.SearchAsync(user, spot.Slug, asAdmin: false, CancellationToken.None);

        Assert.Equal(403, result.Status);
        Assert.Equal(0, provider.SearchCalls);
    }

    [Fact]
    public async Task Local_sem_camera_retorna_404()
    {
        using var db = WebcamTestHarness.CreateDb();
        var user = WebcamTestHarness.User(PlanRules.Capitao);
        var spot = WebcamTestHarness.Official();
        db.Users.Add(user);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var service = WebcamTestHarness.CreateService(db, new FakeWebcamProvider());

        var result = await service.ViewAsync(user, spot.Slug, CancellationToken.None);

        Assert.Equal(404, result.Status);
    }

    [Fact]
    public async Task Camera_indisponivel_nao_retorna_stream()
    {
        using var db = WebcamTestHarness.CreateDb();
        var user = WebcamTestHarness.User(PlanRules.Capitao);
        var spot = WebcamTestHarness.Official();
        db.Users.Add(user);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        db.FishingSpotWebcams.Add(new FishingSpotWebcam
        {
            FishingSpotId = spot.Id,
            Provider = "windy",
            ExternalId = "123456",
            Name = "Campeche",
            CreatedByUserId = user.Id
        });
        await db.SaveChangesAsync();
        var provider = new FakeWebcamProvider();
        provider.Details["123456"] = new WebcamProviderDetails(
            "windy",
            "123456",
            "Campeche",
            -27.65,
            -48.46,
            false,
            false,
            null,
            null,
            WebcamOptions.WindyDisplayName);
        var service = WebcamTestHarness.CreateService(db, provider);

        var result = await service.ViewAsync(user, spot.Slug, CancellationToken.None);

        Assert.Equal(200, result.Status);
        Assert.DoesNotContain("embedUrl", Body(result));
        Assert.Contains("\"isAvailable\":false", Body(result).Replace(" ", string.Empty));
    }

    [Fact]
    public async Task Provider_indisponivel_e_tratado()
    {
        using var db = WebcamTestHarness.CreateDb();
        var admin = WebcamTestHarness.User(PlanRules.Mestre, "Admin");
        var spot = WebcamTestHarness.Official();
        db.Users.Add(admin);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var provider = new FakeWebcamProvider { SearchError = new WebcamProviderException("timeout") };
        var service = WebcamTestHarness.CreateService(db, provider);

        var result = await service.SearchAsync(admin, spot.Slug, asAdmin: true, CancellationToken.None);

        Assert.Equal(502, result.Status);
        Assert.Contains("webcam_provider_unavailable", Body(result));
    }

    [Fact]
    public async Task ExternalId_invalido_nao_e_persistido()
    {
        using var db = WebcamTestHarness.CreateDb();
        var admin = WebcamTestHarness.User(PlanRules.Mestre, "Admin");
        var spot = WebcamTestHarness.Official();
        db.Users.Add(admin);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var service = WebcamTestHarness.CreateService(db, new FakeWebcamProvider());

        var result = await service.LinkAsync(admin, spot.Slug, new WebcamLinkRequest("windy", "nao-existe"), asAdmin: true, CancellationToken.None);

        Assert.Equal(400, result.Status);
        Assert.Equal(0, await db.FishingSpotWebcams.CountAsync());
    }

    [Fact]
    public async Task Provider_desconhecido_nao_consulta_nem_persiste()
    {
        using var db = WebcamTestHarness.CreateDb();
        var admin = WebcamTestHarness.User(PlanRules.Mestre, "Admin");
        var spot = WebcamTestHarness.Official();
        db.Users.Add(admin);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var provider = new FakeWebcamProvider();
        provider.Details["abc"] = WebcamTestHarness.LiveDetails("abc");
        var service = WebcamTestHarness.CreateService(db, provider);

        var result = await service.LinkAsync(admin, spot.Slug, new WebcamLinkRequest("partner", "abc"), asAdmin: true, CancellationToken.None);

        Assert.Equal(400, result.Status);
        Assert.Equal(0, provider.GetCalls);
        Assert.Equal(0, await db.FishingSpotWebcams.CountAsync());
    }

    [Fact]
    public async Task Feature_desligada_no_admin_nao_devolve_stream()
    {
        using var db = WebcamTestHarness.CreateDb();
        db.PlatformSettings.Add(new PlatformSettings
        {
            Id = Guid.Parse("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0010"),
            ShowLiveWebcams = false
        });
        var user = WebcamTestHarness.User(PlanRules.Capitao);
        var spot = WebcamTestHarness.Official();
        db.Users.Add(user);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        db.FishingSpotWebcams.Add(new FishingSpotWebcam
        {
            FishingSpotId = spot.Id,
            Provider = "windy",
            ExternalId = "123456",
            Name = "Campeche",
            IsAvailable = true,
            LastAvailabilityCheck = DateTimeOffset.UtcNow,
            CreatedByUserId = user.Id
        });
        await db.SaveChangesAsync();
        var provider = new FakeWebcamProvider();
        provider.Details["123456"] = WebcamTestHarness.LiveDetails();
        var service = WebcamTestHarness.CreateService(db, provider);

        var result = await service.ViewAsync(user, spot.Slug, CancellationToken.None);

        Assert.Equal(403, result.Status);
        Assert.DoesNotContain("embedUrl", Body(result));
        Assert.Contains("feature_disabled", Body(result));
        Assert.Equal(0, provider.GetCalls);
    }

    [Fact]
    public async Task Admin_pesquisa_com_feature_desligada()
    {
        using var db = WebcamTestHarness.CreateDb();
        db.PlatformSettings.Add(new PlatformSettings
        {
            Id = Guid.Parse("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0010"),
            ShowLiveWebcams = false
        });
        var admin = WebcamTestHarness.User(PlanRules.Mestre, "Admin");
        var spot = WebcamTestHarness.Official();
        db.Users.Add(admin);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var provider = new FakeWebcamProvider();
        provider.SearchResults.Add(WebcamTestHarness.LiveHit());
        var service = WebcamTestHarness.CreateService(db, provider);

        var result = await service.SearchAsync(admin, spot.Slug, asAdmin: true, CancellationToken.None);

        Assert.Equal(200, result.Status);
        Assert.Equal(1, provider.SearchCalls);
    }

    [Fact]
    public async Task Vinculo_duplicado_nao_e_criado()
    {
        using var db = WebcamTestHarness.CreateDb();
        var admin = WebcamTestHarness.User(PlanRules.Mestre, "Admin");
        var spot = WebcamTestHarness.Official();
        db.Users.Add(admin);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var provider = new FakeWebcamProvider();
        provider.Details["111"] = WebcamTestHarness.LiveDetails("111", "Uma");
        provider.Details["222"] = WebcamTestHarness.LiveDetails("222", "Outra");
        var service = WebcamTestHarness.CreateService(db, provider);

        await service.LinkAsync(admin, spot.Slug, new WebcamLinkRequest("windy", "111"), asAdmin: true, CancellationToken.None);
        await service.LinkAsync(admin, spot.Slug, new WebcamLinkRequest("windy", "111"), asAdmin: true, CancellationToken.None);
        await service.LinkAsync(admin, spot.Slug, new WebcamLinkRequest("windy", "222"), asAdmin: true, CancellationToken.None);

        Assert.Equal(1, await db.FishingSpotWebcams.CountAsync(item => item.IsActive));
        Assert.Equal("222", await db.FishingSpotWebcams.Where(item => item.IsActive).Select(item => item.ExternalId).SingleAsync());
    }

    [Fact]
    public async Task Provider_nao_configurado_nao_quebra_pesquisa()
    {
        using var db = WebcamTestHarness.CreateDb();
        var admin = WebcamTestHarness.User(PlanRules.Mestre, "Admin");
        var spot = WebcamTestHarness.Official();
        db.Users.Add(admin);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var provider = new FakeWebcamProvider { IsConfigured = false };
        var service = WebcamTestHarness.CreateService(db, provider);

        var result = await service.SearchAsync(admin, spot.Slug, asAdmin: true, CancellationToken.None);

        Assert.Equal(503, result.Status);
        Assert.Contains("webcam_unconfigured", Body(result));
    }

    [Fact]
    public async Task Admin_consulta_transmissao_do_youtube()
    {
        using var db = WebcamTestHarness.CreateDb();
        var admin = WebcamTestHarness.User(PlanRules.Mestre, "Admin");
        var spot = WebcamTestHarness.Official();
        db.Users.Add(admin);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var youtube = new FakeWebcamProvider(WebcamOptions.YouTubeProviderId, WebcamOptions.YouTubeDisplayName);
        youtube.LookupResults.Add(WebcamTestHarness.YouTubeHit());
        youtube.Details["dQw4w9WgXcQ"] = WebcamTestHarness.YouTubeLiveDetails();
        var service = WebcamTestHarness.CreateService(db, new FakeWebcamProvider(), youtube);

        var result = await service.LookupAsync(admin, spot.Slug, "https://www.youtube.com/watch?v=dQw4w9WgXcQ", CancellationToken.None);

        Assert.Equal(200, result.Status);
        Assert.Equal(1, youtube.LookupCalls);
        Assert.Contains("dQw4w9WgXcQ", Body(result));
        Assert.Contains("youtube", Body(result));
    }

    [Fact]
    public async Task Admin_vincula_camera_do_youtube()
    {
        using var db = WebcamTestHarness.CreateDb();
        var admin = WebcamTestHarness.User(PlanRules.Mestre, "Admin");
        var spot = WebcamTestHarness.Official();
        db.Users.Add(admin);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var youtube = new FakeWebcamProvider(WebcamOptions.YouTubeProviderId, WebcamOptions.YouTubeDisplayName);
        youtube.Details["dQw4w9WgXcQ"] = WebcamTestHarness.YouTubeLiveDetails();
        var service = WebcamTestHarness.CreateService(db, new FakeWebcamProvider(), youtube);

        var result = await service.LinkAsync(admin, spot.Slug, new WebcamLinkRequest("youtube", "dQw4w9WgXcQ"), asAdmin: true, CancellationToken.None);

        Assert.Equal(200, result.Status);
        Assert.Equal(1, await db.FishingSpotWebcams.CountAsync(item => item.IsActive && item.Provider == "youtube"));
        Assert.Contains("embedUrl", Body(result));
    }

    [Fact]
    public async Task Capitao_nao_vincula_youtube()
    {
        using var db = WebcamTestHarness.CreateDb();
        var user = WebcamTestHarness.User(PlanRules.Capitao);
        var spot = WebcamTestHarness.Personal(user, "meu-local");
        db.Users.Add(user);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var youtube = new FakeWebcamProvider(WebcamOptions.YouTubeProviderId, WebcamOptions.YouTubeDisplayName);
        youtube.Details["dQw4w9WgXcQ"] = WebcamTestHarness.YouTubeLiveDetails();
        var service = WebcamTestHarness.CreateService(db, new FakeWebcamProvider(), youtube);

        var result = await service.LinkAsync(user, spot.Slug, new WebcamLinkRequest("youtube", "dQw4w9WgXcQ"), asAdmin: false, CancellationToken.None);

        Assert.Equal(403, result.Status);
        Assert.Equal(0, youtube.GetCalls);
        Assert.Equal(0, await db.FishingSpotWebcams.CountAsync());
        Assert.DoesNotContain("embedUrl", Body(result));
    }

    [Fact]
    public async Task Usuario_nao_consulta_youtube()
    {
        using var db = WebcamTestHarness.CreateDb();
        var user = WebcamTestHarness.User(PlanRules.Capitao);
        var spot = WebcamTestHarness.Personal(user, "meu-local");
        db.Users.Add(user);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var youtube = new FakeWebcamProvider(WebcamOptions.YouTubeProviderId, WebcamOptions.YouTubeDisplayName);
        youtube.LookupResults.Add(WebcamTestHarness.YouTubeHit());
        var service = WebcamTestHarness.CreateService(db, new FakeWebcamProvider(), youtube);

        var result = await service.LookupAsync(user, spot.Slug, "https://youtu.be/dQw4w9WgXcQ", CancellationToken.None);

        Assert.Equal(403, result.Status);
        Assert.Equal(0, youtube.LookupCalls);
    }

    [Fact]
    public async Task Youtube_fora_do_ar_nao_quebra_consulta()
    {
        using var db = WebcamTestHarness.CreateDb();
        var admin = WebcamTestHarness.User(PlanRules.Mestre, "Admin");
        var spot = WebcamTestHarness.Official();
        db.Users.Add(admin);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var youtube = new FakeWebcamProvider(WebcamOptions.YouTubeProviderId, WebcamOptions.YouTubeDisplayName)
        {
            LookupError = new WebcamProviderException("down")
        };
        var service = WebcamTestHarness.CreateService(db, youtube);

        var result = await service.LookupAsync(admin, spot.Slug, "https://youtu.be/dQw4w9WgXcQ", CancellationToken.None);

        Assert.Equal(502, result.Status);
        Assert.Contains("webcam_provider_unavailable", Body(result));
    }

    [Fact]
    public async Task Youtube_nao_configurado_nao_quebra_consulta()
    {
        using var db = WebcamTestHarness.CreateDb();
        var admin = WebcamTestHarness.User(PlanRules.Mestre, "Admin");
        var spot = WebcamTestHarness.Official();
        db.Users.Add(admin);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var youtube = new FakeWebcamProvider(WebcamOptions.YouTubeProviderId, WebcamOptions.YouTubeDisplayName) { IsConfigured = false };
        var service = WebcamTestHarness.CreateService(db, youtube);

        var result = await service.LookupAsync(admin, spot.Slug, "https://youtu.be/dQw4w9WgXcQ", CancellationToken.None);

        Assert.Equal(503, result.Status);
        Assert.Contains("webcam_unconfigured", Body(result));
    }

    [Fact]
    public async Task Youtube_vod_nao_e_vinculado()
    {
        using var db = WebcamTestHarness.CreateDb();
        var admin = WebcamTestHarness.User(PlanRules.Mestre, "Admin");
        var spot = WebcamTestHarness.Official();
        db.Users.Add(admin);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var youtube = new FakeWebcamProvider(WebcamOptions.YouTubeProviderId, WebcamOptions.YouTubeDisplayName);
        youtube.Details["dQw4w9WgXcQ"] = WebcamTestHarness.YouTubeLiveDetails() with { IsLive = false };
        var service = WebcamTestHarness.CreateService(db, youtube);

        var result = await service.LinkAsync(admin, spot.Slug, new WebcamLinkRequest("youtube", "dQw4w9WgXcQ"), asAdmin: true, CancellationToken.None);

        Assert.Equal(400, result.Status);
        Assert.Equal(0, await db.FishingSpotWebcams.CountAsync());
    }

    [Fact]
    public async Task Link_invalido_do_youtube_nao_consulta_provider()
    {
        using var db = WebcamTestHarness.CreateDb();
        var admin = WebcamTestHarness.User(PlanRules.Mestre, "Admin");
        var spot = WebcamTestHarness.Official();
        db.Users.Add(admin);
        db.FishingSpots.Add(spot);
        await db.SaveChangesAsync();
        var youtube = new FakeWebcamProvider(WebcamOptions.YouTubeProviderId, WebcamOptions.YouTubeDisplayName);
        var service = WebcamTestHarness.CreateService(db, youtube);

        var result = await service.LookupAsync(admin, spot.Slug, "https://example.com/watch?v=dQw4w9WgXcQ", CancellationToken.None);

        Assert.Equal(400, result.Status);
        Assert.Equal(0, youtube.LookupCalls);
        Assert.Contains("webcam_invalid", Body(result));
    }

    private static string Body(WebcamHttpResult result) =>
        System.Text.Json.JsonSerializer.Serialize(result.Body);
}
