using Microsoft.EntityFrameworkCore;
using TaNoMar.Monitor.Configuration;
using TaNoMar.Monitor.Monitoring;
using TaNoMar.Monitor.Persistence;
using Xunit;

namespace TaNoMar.Monitor.Tests;

public sealed class SqlitePersistenceTests
{
    [Fact]
    public async Task Down_state_and_alert_marker_survive_a_new_context()
    {
        var path = Path.Combine(Path.GetTempPath(), $"tanomar-monitor-{Guid.NewGuid():N}.db");
        try
        {
            var factory = new SqliteFactory(path);
            await using (var setup = factory.CreateDbContext()) await setup.Database.EnsureCreatedAsync();
            var state = new MonitorCheckState
            {
                Name = "API",
                Status = CheckStatus.Down,
                ConsecutiveFailures = 3,
                OutageStartedAt = DateTimeOffset.UtcNow,
                DownAlertSent = true,
                DownAlertAttempts = 1
            };
            await using (var db = factory.CreateDbContext())
            {
                db.Checks.Add(state);
                await db.SaveChangesAsync();
            }
            await using (var restarted = factory.CreateDbContext())
            {
                var persisted = await restarted.Checks.SingleAsync();
                Assert.Equal(CheckStatus.Down, persisted.Status);
                Assert.True(persisted.DownAlertSent);
                Assert.Equal(3, persisted.ConsecutiveFailures);
                Assert.NotNull(persisted.OutageStartedAt);
            }
        }
        finally
        {
            if (File.Exists(path)) File.Delete(path);
            if (File.Exists($"{path}-shm")) File.Delete($"{path}-shm");
            if (File.Exists($"{path}-wal")) File.Delete($"{path}-wal");
        }
    }

    private sealed class SqliteFactory(string path)
    {
        public MonitorDbContext CreateDbContext()
            => new(new DbContextOptionsBuilder<MonitorDbContext>().UseSqlite($"Data Source={path};Pooling=False").Options);
    }
}
