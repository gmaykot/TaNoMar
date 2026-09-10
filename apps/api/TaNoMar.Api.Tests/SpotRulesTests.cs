using TaNoMar.Api.Data;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class SpotRulesTests
{
    [Fact]
    public void Official_active_free_default_is_visible_to_free_plan()
    {
        var spot = Official(isActive: true, isFreeDefault: true);
        Assert.True(SpotRules.CanSee(spot, User("free")));
        Assert.True(SpotRules.IsCommunityVisible(spot));
    }

    [Fact]
    public void Official_active_without_free_default_is_hidden_from_free_plan()
    {
        var spot = Official(isActive: true, isFreeDefault: false);
        Assert.False(SpotRules.CanSee(spot, User("free")));
        Assert.True(SpotRules.CanSee(spot, User("premium")));
    }

    [Fact]
    public void Official_inactive_is_hidden_from_everyone()
    {
        var spot = Official(isActive: false, isFreeDefault: true);
        Assert.False(SpotRules.CanSee(spot, User("free")));
        Assert.False(SpotRules.CanSee(spot, User("capitao")));
        Assert.False(SpotRules.IsCommunityVisible(spot));
    }

    [Fact]
    public void Owner_still_sees_personal_spot()
    {
        var owner = User("free");
        var spot = new FishingSpot("molhe", "Molhe", "leste", -27.4, -48.5, 90, "praia_aberta")
        {
            Visibility = "private",
            OwnerUserId = owner.Id,
            IsActive = true,
            IsFreeDefault = false
        };
        Assert.True(SpotRules.CanSee(spot, owner));
        Assert.False(SpotRules.CanSee(spot, User("premium")));
    }

    [Fact]
    public void Slugify_removes_accents_and_spaces()
    {
        Assert.Equal("pantano-do-sul", SpotRules.Slugify("Pântano do Sul"));
        Assert.Equal("local", SpotRules.Slugify("   "));
    }

    [Fact]
    public void Normalizes_legacy_island_regions()
    {
        Assert.Equal("norte", SpotRules.NormalizeRegion("Norte da ilha"));
        Assert.Equal("sul", SpotRules.NormalizeRegion("Sul da ilha"));
        Assert.Equal("leste", SpotRules.NormalizeRegion("Leste da ilha"));
        Assert.Equal("oeste", SpotRules.NormalizeRegion("Oeste da ilha"));
        Assert.Equal("continente", SpotRules.NormalizeRegion("Continente"));
        Assert.Equal("ilhas", SpotRules.NormalizeRegion("Ilhas"));
        Assert.Equal(SpotRules.EntireIslandPreference, SpotRules.NormalizeRegion("Florianópolis"));
        Assert.True(SpotRules.IsValidSpotRegion("norte"));
        Assert.False(SpotRules.IsValidSpotRegion("Ilha de Santa Catarina"));
        Assert.Equal("outro", SpotRules.NormalizeType("personalizado"));
        Assert.Equal("lagoa", SpotRules.NormalizeType("lagoa"));
    }

    [Fact]
    public void Entire_island_preference_matches_quadrants_not_continent_or_islands()
    {
        Assert.True(SpotRules.IsInPreferredRegion("norte", SpotRules.EntireIslandPreference));
        Assert.True(SpotRules.IsInPreferredRegion("sul", "Florianópolis"));
        Assert.False(SpotRules.IsInPreferredRegion("continente", SpotRules.EntireIslandPreference));
        Assert.False(SpotRules.IsInPreferredRegion("ilhas", SpotRules.EntireIslandPreference));
        Assert.True(SpotRules.IsInPreferredRegion("continente", "Ilha de Santa Catarina | continente"));
        Assert.True(SpotRules.IsInPreferredRegion("leste", "norte | leste"));
        Assert.False(SpotRules.IsInPreferredRegion("oeste", "norte | leste"));
    }

    [Fact]
    public void Free_plan_still_hides_official_spot_without_free_default()
    {
        var spot = Official(isActive: true, isFreeDefault: false);
        spot.Type = "ilha";
        spot.FishingEnvironment = "mar_aberto";
        Assert.False(SpotRules.CanSee(spot, User("free")));
        Assert.True(SpotRules.CanSee(spot, User("premium")));
    }

    private static FishingSpot Official(bool isActive, bool isFreeDefault) =>
        new("campeche", "Campeche", "sul", -27.65, -48.46, 110, "praia_aberta")
        {
            IsActive = isActive,
            IsFreeDefault = isFreeDefault
        };

    private static User User(string planCode) =>
        new() { Id = Guid.NewGuid(), PlanCode = planCode, Role = "User" };
}
