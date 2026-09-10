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
        var spot = new FishingSpot("molhe", "Molhe", "Leste da ilha", -27.4, -48.5, 90, "praia_aberta")
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

    private static FishingSpot Official(bool isActive, bool isFreeDefault) =>
        new("campeche", "Campeche", "Sul da ilha", -27.65, -48.46, 110, "praia_aberta")
        {
            IsActive = isActive,
            IsFreeDefault = isFreeDefault
        };

    private static User User(string planCode) =>
        new() { Id = Guid.NewGuid(), PlanCode = planCode, Role = "User" };
}
