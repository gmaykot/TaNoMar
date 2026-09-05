using Microsoft.EntityFrameworkCore;

namespace TaNoMar.Api.Data;

public sealed class TaNoMarDbContext(DbContextOptions<TaNoMarDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<FishingSpot> FishingSpots => Set<FishingSpot>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<CommunityReport> CommunityReports => Set<CommunityReport>();
    public DbSet<CommunityReportVote> CommunityReportVotes => Set<CommunityReportVote>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<UserPreference> UserPreferences => Set<UserPreference>();
    public DbSet<FavoriteSpot> FavoriteSpots => Set<FavoriteSpot>();
    public DbSet<FishingForecastSnapshot> FishingForecastSnapshots => Set<FishingForecastSnapshot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(user => user.GoogleSubject).IsUnique();
        modelBuilder.Entity<User>().HasIndex(user => user.Email).IsUnique();
        modelBuilder.Entity<FishingSpot>().HasIndex(spot => spot.Slug).IsUnique();
        modelBuilder.Entity<Plan>().HasIndex(plan => plan.Code).IsUnique();
        modelBuilder.Entity<RefreshToken>().HasIndex(token => token.TokenHash).IsUnique();
        modelBuilder.Entity<UserPreference>().HasIndex(item => item.UserId).IsUnique();
        modelBuilder.Entity<FavoriteSpot>().HasIndex(item => new { item.UserId, item.FishingSpotId }).IsUnique();
        modelBuilder.Entity<CommunityReportVote>().HasIndex(vote => new { vote.ReportId, vote.UserId }).IsUnique();
        modelBuilder.Entity<FishingForecastSnapshot>().HasIndex(item => new { item.LocationId, item.Date }).IsUnique();
        modelBuilder.Entity<FishingForecastSnapshot>().Property(item => item.PayloadJson).HasColumnType("jsonb");

        modelBuilder.Entity<Plan>().HasData(
            new Plan { Id = Guid.Parse("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0001"), Code = "free", Name = "Free", MaxForecastDays = 3, MaxFavorites = 3, MaxPersonalSpots = 0, MaxAlerts = 0 },
            new Plan { Id = Guid.Parse("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0002"), Code = "premium", Name = "Premium", MaxForecastDays = 8, MaxFavorites = 20, MaxPersonalSpots = 10, MaxAlerts = 10 });

    }
}

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string GoogleSubject { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PictureUrl { get; set; }
    public string Role { get; set; } = "User";
    public bool IsActive { get; set; } = true;
    public string PlanCode { get; set; } = "free";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
}

public sealed class FishingSpot
{
    public FishingSpot() { }
    public FishingSpot(string slug, string name, double latitude, double longitude, double seaOrientationDegrees, string profile)
    { Slug = slug; Name = name; Latitude = latitude; Longitude = longitude; SeaOrientationDegrees = seaOrientationDegrees; Profile = profile; Visibility = "official"; City = "Florianópolis"; State = "SC"; Region = "Ilha de Santa Catarina"; }
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public string Type { get; set; } = "praia";
    public string Visibility { get; set; } = "official";
    public bool IsApproved { get; set; } = true;
    public Guid? OwnerUserId { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double SeaOrientationDegrees { get; set; }
    public string Profile { get; set; } = "praia_aberta";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class Plan
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int MaxForecastDays { get; set; }
    public int MaxFavorites { get; set; }
    public int MaxPersonalSpots { get; set; }
    public int MaxAlerts { get; set; }
}

public sealed class CommunityReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid FishingSpotId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? Comment { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; } = DateTimeOffset.UtcNow.AddHours(12);
    public int Confirmations { get; set; }
    public int Contested { get; set; }
}

public sealed class CommunityReportVote
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ReportId { get; set; }
    public Guid UserId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ReadAt { get; set; }
    public DateTimeOffset? RemovedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; } = DateTimeOffset.UtcNow.AddHours(48);
}

public sealed class UserPreference
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Region { get; set; } = "Florianópolis";
    public string WindUnit { get; set; } = "kmh";
    public bool ForecastNotifications { get; set; } = true;
}

public sealed class FavoriteSpot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid FishingSpotId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class FishingForecastSnapshot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string LocationId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string PayloadJson { get; set; } = "{}";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; } = DateTimeOffset.UtcNow;
}
