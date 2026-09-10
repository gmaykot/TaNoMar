using TaNoMar.Api.Fishing;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class FishingForecastRefreshQueueTests
{
    [Fact]
    public async Task Deduplicates_pending_location_and_tracks_failure_until_success()
    {
        var queue = new FishingForecastRefreshQueue(
            Microsoft.Extensions.Options.Options.Create(new FishingOptions()));
        var location = new FishingLocation { Id = "campeche" };

        Assert.True(queue.Enqueue(location));
        Assert.False(queue.Enqueue(location));
        Assert.Equal(["campeche"], queue.Snapshot(["campeche"]).PendingSpotIds);

        var failed = await queue.ReadAsync(CancellationToken.None);
        queue.Complete([failed], null);
        Assert.Equal(["campeche"], queue.Snapshot(["campeche"]).FailedSpotIds);

        Assert.True(queue.Enqueue(location));
        var succeeded = await queue.ReadAsync(CancellationToken.None);
        queue.Complete([succeeded], new HashSet<string>(StringComparer.Ordinal) { "campeche" });

        var snapshot = queue.Snapshot(["campeche"]);
        Assert.Empty(snapshot.PendingSpotIds);
        Assert.Empty(snapshot.FailedSpotIds);
    }
}
