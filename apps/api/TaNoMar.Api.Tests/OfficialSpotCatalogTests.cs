using Microsoft.EntityFrameworkCore;
using TaNoMar.Api.Data;
using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class OfficialSpotCatalogTests
{
    [Fact]
    public async Task Seed_inserts_grande_florianopolis_catalog_once()
    {
        using var db = CreateDb();

        await TaNoMarDbSeeder.SeedOfficialSpotsAsync(db);
        var first = await db.FishingSpots.CountAsync(spot => spot.Visibility == "official");
        Assert.Equal(OfficialSpotCatalog.All.Count, first);
        Assert.Contains(db.FishingSpots, spot => spot.Slug == "campeche" && spot.IsFreeDefault);
        Assert.Contains(db.FishingSpots, spot => spot.Name == "Canal da Barra da Lagoa" && spot.Type == "canal");
        Assert.Contains(db.FishingSpots, spot => spot.Name == "Lagoa da Conceição" && spot.Type == "lagoa");
        Assert.Contains(db.FishingSpots, spot => spot.Name == "Ilha do Xavier" && spot.Type == "ilha");
        Assert.Contains(db.FishingSpots, spot => spot.Name == "Ilha das Campanhas" && spot.Latitude == null);

        await TaNoMarDbSeeder.SeedOfficialSpotsAsync(db);
        Assert.Equal(first, await db.FishingSpots.CountAsync(spot => spot.Visibility == "official"));
    }

    [Fact]
    public async Task Seed_complements_existing_spot_without_duplicating_or_resetting_flags()
    {
        using var db = CreateDb();
        var existing = new FishingSpot("campeche", "Campeche", "Sul da ilha", -27.65407, -48.46908, 110, "praia_aberta")
        {
            Type = "praia",
            IsActive = false,
            IsFreeDefault = false
        };
        db.FishingSpots.Add(existing);
        await db.SaveChangesAsync();

        await TaNoMarDbSeeder.SeedOfficialSpotsAsync(db);

        var campeche = Assert.Single(db.FishingSpots, spot => spot.Slug == "campeche");
        Assert.Equal(existing.Id, campeche.Id);
        Assert.Equal("sul", campeche.Region);
        Assert.Equal("praia", campeche.Type);
        Assert.Equal("mar_aberto", campeche.FishingEnvironment);
        Assert.Equal(-27.65407, campeche.Latitude);
        Assert.Equal(110, campeche.SeaOrientationDegrees);
        Assert.False(campeche.IsActive);
        Assert.False(campeche.IsFreeDefault);
        Assert.Equal(OfficialSpotCatalog.All.Count, await db.FishingSpots.CountAsync(spot => spot.Visibility == "official"));
    }

    [Fact]
    public async Task Seed_moves_ribeirao_from_legacy_west_label_to_south()
    {
        using var db = CreateDb();
        db.FishingSpots.Add(new FishingSpot("ribeirao", "Ribeirão da Ilha", "Oeste da ilha", -27.71773, -48.56266, 270, "praia_protegida"));
        await db.SaveChangesAsync();

        await TaNoMarDbSeeder.SeedOfficialSpotsAsync(db);

        var ribeirao = Assert.Single(db.FishingSpots, spot => spot.Slug == "ribeirao");
        Assert.Equal("sul", ribeirao.Region);
        Assert.Equal("baia", ribeirao.FishingEnvironment);
        Assert.Equal(-27.71773, ribeirao.Latitude);
        Assert.Equal(270, ribeirao.SeaOrientationDegrees);
    }

    [Fact]
    public void Catalog_covers_grande_florianopolis_and_free_defaults()
    {
        var names = OfficialSpotCatalog.All.Select(item => item.Name).ToArray();
        Assert.Equal(49, names.Length);
        Assert.Contains("Praia Brava", names);
        Assert.Contains("Canal da Barra da Lagoa", names);
        Assert.Contains("Ponte da Lagoa / Rendeiras", names);
        Assert.Contains("Ilha do Xavier", names);
        Assert.Contains("Rio Biguaçu", names);
        Assert.Contains("Praia de São Miguel", names);
        Assert.Equal(
            [
                "Praia Brava",
                "Canasvieiras",
                "Praia dos Ingleses",
                "Santinho",
                "Barra da Lagoa",
                "Canal da Barra da Lagoa",
                "Joaquina",
                "Lagoa da Conceição",
                "Ponte da Lagoa / Rendeiras",
                "Campeche",
                "Morro das Pedras",
                "Armação",
                "Pântano do Sul",
                "Ribeirão da Ilha",
                "Ilha do Campeche"
            ],
            OfficialSpotCatalog.All.Where(item => item.IsFreeDefault).Select(item => item.Name).ToArray());
        Assert.Equal("sul", OfficialSpotCatalog.All.Single(item => item.Slug == "ribeirao").Region);
        Assert.Equal(["Ilha das Campanhas", "Ilha das Cabras"], OfficialSpotCatalog.PendingCoordinates);
    }

    [Fact]
    public void Catalog_keeps_existing_seed_coordinates()
    {
        var campeche = OfficialSpotCatalog.All.Single(item => item.Slug == "campeche");
        Assert.Equal(-27.65407, campeche.Latitude);
        Assert.Equal(-48.46908, campeche.Longitude);
        Assert.Equal(110, campeche.SeaOrientationDegrees);
        Assert.Equal(["Ilha das Campanhas", "Ilha das Cabras"], OfficialSpotCatalog.PendingCoordinates);
    }

    [Fact]
    public void ToSpot_persists_classification_and_skips_unreliable_coordinates()
    {
        var canal = OfficialSpotCatalog.All.Single(item => item.Slug == "canal-da-barra-da-lagoa");
        var spot = OfficialSpotCatalog.ToSpot(canal);
        Assert.Equal("canal", spot.Type);
        Assert.Equal("estuarino", spot.FishingEnvironment);
        Assert.Equal("terrestre", spot.AccessType);
        Assert.Equal("leste", spot.Region);
        Assert.True(spot.IsFreeDefault);
        Assert.True(SpotRules.HasCoordinates(spot));

        var campanhas = OfficialSpotCatalog.ToSpot(OfficialSpotCatalog.All.Single(item => item.Slug == "ilha-das-campanhas"));
        Assert.Equal("ilha", campanhas.Type);
        Assert.False(SpotRules.HasCoordinates(campanhas));
        Assert.Null(campanhas.SeaOrientationDegrees);
        Assert.Null(campanhas.RestrictionNotes);
    }

    [Fact]
    public void New_spot_types_do_not_break_score_calculator()
    {
        var withOrientation = FishingScoreCalculator.Calculate(8, 10, 90, 90, 0.8, 8, 10, 0, 7, "praia_protegida");
        var withoutOrientation = FishingScoreCalculator.Calculate(8, 10, 90, null, 0.8, 8, 10, 0, 7, "praia_protegida");
        Assert.InRange(withOrientation, 0, 10);
        Assert.InRange(withoutOrientation, 0, 10);
        Assert.Equal(string.Empty, FishingScoreCalculator.WindOrigin(90, null));
        Assert.Equal("mar", FishingScoreCalculator.WindOrigin(90, 90));
    }

    private static TaNoMarDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<TaNoMarDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new TaNoMarDbContext(options);
    }
}
