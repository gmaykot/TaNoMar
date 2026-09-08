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
    public DbSet<DevicePushSubscription> PushSubscriptions => Set<DevicePushSubscription>();
    public DbSet<UserPreference> UserPreferences => Set<UserPreference>();
    public DbSet<FavoriteSpot> FavoriteSpots => Set<FavoriteSpot>();
    public DbSet<EnabledSpot> EnabledSpots => Set<EnabledSpot>();
    public DbSet<FishingForecastSnapshot> FishingForecastSnapshots => Set<FishingForecastSnapshot>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<PartnerOffer> PartnerOffers => Set<PartnerOffer>();
    public DbSet<PlatformSettings> PlatformSettings => Set<PlatformSettings>();
    public DbSet<ForecastAlert> ForecastAlerts => Set<ForecastAlert>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(user => user.GoogleSubject).IsUnique();
        modelBuilder.Entity<User>().HasIndex(user => user.Email).IsUnique();
        modelBuilder.Entity<FishingSpot>().HasIndex(spot => spot.Slug).IsUnique();
        modelBuilder.Entity<Plan>().HasIndex(plan => plan.Code).IsUnique();
        modelBuilder.Entity<RefreshToken>().HasIndex(token => token.TokenHash).IsUnique();
        modelBuilder.Entity<UserPreference>().HasIndex(item => item.UserId).IsUnique();
        modelBuilder.Entity<FavoriteSpot>().HasIndex(item => new { item.UserId, item.FishingSpotId }).IsUnique();
        modelBuilder.Entity<EnabledSpot>().HasIndex(item => new { item.UserId, item.FishingSpotId }).IsUnique();
        modelBuilder.Entity<DevicePushSubscription>().HasIndex(item => item.Endpoint).IsUnique();
        modelBuilder.Entity<DevicePushSubscription>().HasIndex(item => item.UserId);
        modelBuilder.Entity<CommunityReportVote>().HasIndex(vote => new { vote.ReportId, vote.UserId }).IsUnique();
        modelBuilder.Entity<FishingForecastSnapshot>().HasIndex(item => new { item.LocationId, item.Date }).IsUnique();
        modelBuilder.Entity<FishingForecastSnapshot>().Property(item => item.PayloadJson).HasColumnType("jsonb");
        modelBuilder.Entity<Partner>().HasIndex(item => item.Slug).IsUnique();
        modelBuilder.Entity<PartnerOffer>().HasIndex(item => item.PartnerId);
        modelBuilder.Entity<ForecastAlert>().HasIndex(item => new { item.UserId, item.FishingSpotId }).IsUnique();

        modelBuilder.Entity<Plan>().HasData(
            new Plan
            {
                Id = Guid.Parse("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0001"),
                Code = "free",
                Name = "Free",
                Tagline = "Consulta o mapa TáNoMar.",
                MonthlyPriceCents = 0,
                SortOrder = 0,
                Featured = false,
                MaxForecastDays = 3,
                MaxFavorites = 0,
                MaxPersonalSpots = 0,
                MaxAlerts = 0
            },
            new Plan
            {
                Id = Guid.Parse("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0003"),
                Code = "arrais",
                Name = "Arrais",
                Tagline = "O primeiro comando da sua pesca.",
                MonthlyPriceCents = 1490,
                SortOrder = 1,
                Featured = false,
                MaxForecastDays = 5,
                MaxFavorites = 10,
                MaxPersonalSpots = 5,
                MaxAlerts = 5,
                CanMarine = true,
                CanDiary = true,
                CanOffline = true,
                CanCustomMetrics = true,
                CanCommunityVote = true,
                CanRankingEmphasis = true
            },
            new Plan
            {
                Id = Guid.Parse("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0002"),
                Code = "premium",
                Name = "Mestre",
                Tagline = "O equilíbrio para planejar a semana.",
                MonthlyPriceCents = 1990,
                SortOrder = 2,
                Featured = true,
                MaxForecastDays = 8,
                MaxFavorites = 20,
                MaxPersonalSpots = 10,
                MaxAlerts = 10,
                CanMarine = true,
                CanDiary = true,
                CanOffline = true,
                CanCustomMetrics = true,
                CanCommunityVote = true,
                CanRankingEmphasis = true
            },
            new Plan
            {
                Id = Guid.Parse("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0004"),
                Code = "capitao",
                Name = "Capitão",
                Tagline = "Mais cotas para quem pesca o ano todo.",
                MonthlyPriceCents = 2490,
                SortOrder = 3,
                Featured = false,
                MaxForecastDays = 8,
                MaxFavorites = 40,
                MaxPersonalSpots = 20,
                MaxAlerts = 20,
                CanMarine = true,
                CanDiary = true,
                CanOffline = true,
                CanCustomMetrics = true,
                CanCommunityVote = true,
                CanRankingEmphasis = true
            });
        modelBuilder.Entity<PlatformSettings>().HasData(
            new PlatformSettings { Id = Guid.Parse("7a4c1e87-3184-4fd6-8b38-4a6d0e0b0010"), ShowPartners = false });

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
    public FishingSpot(string slug, string name, string region, double latitude, double longitude, double seaOrientationDegrees, string profile)
    { Slug = slug; Name = name; Region = region; Latitude = latitude; Longitude = longitude; SeaOrientationDegrees = seaOrientationDegrees; Profile = profile; Visibility = "official"; City = "Florianópolis"; State = "SC"; }
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
    public string Tagline { get; set; } = string.Empty;
    public int MonthlyPriceCents { get; set; }
    public int SortOrder { get; set; }
    public bool Featured { get; set; }
    public int MaxForecastDays { get; set; }
    public int MaxFavorites { get; set; }
    public int MaxPersonalSpots { get; set; }
    public int MaxAlerts { get; set; }
    public bool CanMarine { get; set; }
    public bool CanDiary { get; set; }
    public bool CanOffline { get; set; }
    public bool CanCustomMetrics { get; set; }
    public bool CanCommunityVote { get; set; }
    public bool CanRankingEmphasis { get; set; }
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
    public string? Region { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ReadAt { get; set; }
    public DateTimeOffset? RemovedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; } = DateTimeOffset.UtcNow.AddHours(48);
}

public sealed class DevicePushSubscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Endpoint { get; set; } = string.Empty;
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class UserPreference
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Region { get; set; } = "Florianópolis";
    public string WindUnit { get; set; } = "kmh";
    public bool ForecastNotifications { get; set; } = true;
    public string VisibleMetrics { get; set; } = "wind,gusts,waves,wave-period,swell,rain,air-temperature,water-temperature";
}

public sealed class FavoriteSpot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid FishingSpotId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class EnabledSpot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid FishingSpotId { get; set; }
    public bool IsEnabled { get; set; }
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

public sealed class Partner
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "loja";
    public string? Tagline { get; set; }
    public string? About { get; set; }
    public string City { get; set; } = string.Empty;
    public string? WhatsApp { get; set; }
    public string? Instagram { get; set; }
    public string? Website { get; set; }
    public string? MapsUrl { get; set; }
    public string? CoverImageUrl { get; set; }
    public bool IsPublished { get; set; }
    public bool IsFeatured { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class PartnerOffer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PartnerId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? PriceLabel { get; set; }
    public DateTimeOffset? EndsAt { get; set; }
    public int SortOrder { get; set; }
}

public sealed class PlatformSettings
{
    public Guid Id { get; set; }
    public bool ShowPartners { get; set; }
}

public sealed class ForecastAlert
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid FishingSpotId { get; set; }
    public double MinimumScore { get; set; } = 8;
    public int LeadHours { get; set; } = 24;
    public bool IsActive { get; set; } = true;
    public DateOnly? LastNotifiedDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
