using TaNoMar.Api.Data;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class PlanRulesTests
{
    [Theory]
    [InlineData("1", 1)]
    [InlineData("2", 2)]
    [InlineData("3", 3)]
    [InlineData("custom", 3)]
    public void BestHourCount_AcceptsPlanOptions(string mode, int expected)
    {
        Assert.Equal(expected, PlanRules.BestHourCount(mode));
    }

    [Fact]
    public void CustomMode_AllowsSelectingAnyAvailableHour()
    {
        Assert.True(PlanRules.CanSelectAnyHour("Custom"));
        Assert.False(PlanRules.CanSelectAnyHour("3"));
    }

    [Fact]
    public void BestHourCount_RejectsUnknownOption()
    {
        Assert.Null(PlanRules.BestHourCount("4"));
    }
}
