using Microsoft.EntityFrameworkCore;
using TaNoMar.Monitor.Monitoring;

namespace TaNoMar.Monitor.Persistence;

public sealed class MonitorDbContext(DbContextOptions<MonitorDbContext> options) : DbContext(options)
{
    public DbSet<MonitorCheckState> Checks => Set<MonitorCheckState>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MonitorCheckState>().HasKey(x => x.Name);
        modelBuilder.Entity<MonitorCheckState>().Property(x => x.Status).HasConversion<string>();
    }
}
