using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class FishingOptionsDefaultsTests
{
    [Fact]
    public void Defaults_preserve_high_medium_low_unavailable_cache_windows()
    {
        var options = new FishingOptions();
        var refreshAfter = TimeSpan.FromHours(options.WarmupIntervalHours);
        var expiresAfter = TimeSpan.FromHours(options.CacheHours);
        var maxStale = TimeSpan.FromHours(Math.Max(options.CacheHours, options.MaxStaleHours));

        Assert.Equal(6, options.CacheHours);
        Assert.Equal(12, options.MaxStaleHours);
        Assert.Equal(3, options.WarmupIntervalHours);
        Assert.True(refreshAfter < expiresAfter);
        Assert.True(expiresAfter < maxStale);
    }
}
