using TaNoMar.Api.Fishing;
using TaNoMar.Api.Workers;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class WorkerCatalogTests
{
    [Theory]
    [InlineData("0 * * * *", "0 * * * *")]
    [InlineData("  0   */3  * * * ", "0 */3 * * *")]
    [InlineData("30 5 * * MON-FRI", "30 5 * * MON-FRI")]
    public void TryNormalizeCron_AcceptsFiveFieldExpressions(string value, string expected)
    {
        Assert.True(WorkerCatalog.TryNormalizeCron(value, out var normalized));
        Assert.Equal(expected, normalized);
    }

    [Theory]
    [InlineData("")]
    [InlineData("* * * *")]
    [InlineData("* * * * * *")]
    [InlineData("60 * * * *")]
    public void TryNormalizeCron_RejectsInvalidExpressions(string value)
    {
        Assert.False(WorkerCatalog.TryNormalizeCron(value, out _));
    }

    [Fact]
    public void Catalog_ListsEveryHostedWorkerWithUniqueKeys()
    {
        Assert.Equal(6, WorkerCatalog.All.Count);
        Assert.Equal(WorkerCatalog.All.Count, WorkerCatalog.All.Select(item => item.Key).Distinct().Count());
        Assert.All(
            WorkerCatalog.All.Where(item => item.Kind == WorkerKind.Scheduled),
            item => Assert.True(WorkerCatalog.TryNormalizeCron(item.DefaultCronExpression, out _)));
        Assert.All(
            WorkerCatalog.All.Where(item => item.Kind == WorkerKind.Queue),
            item => Assert.Null(item.DefaultCronExpression));
    }

    [Fact]
    public void WarmupDefaultCron_PreservesConfiguredInterval()
    {
        var options = new FishingOptions { WarmupIntervalHours = 6 };

        Assert.Equal("0 */6 * * *", WorkerCatalog.WarmupDefaultCron(options));
    }
}
