using Microsoft.EntityFrameworkCore;
using TaNoMar.Api.Auth;
using TaNoMar.Api.Data;
using TaNoMar.Api.Notifications;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class ConcurrentSessionMonitorTests
{
    [Theory]
    [InlineData("Mozilla/5.0 (Linux; Android 14) AppleWebKit Chrome/120.0.0.0 Mobile Safari/537.36", "Chrome no Android")]
    [InlineData("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Version/17.0 Mobile Safari/604.1", "Safari no iPhone")]
    [InlineData("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0", "Edge no Windows")]
    [InlineData("", "Navegador desconhecido")]
    public void Describe_reads_browser_and_system(string userAgent, string expected) =>
        Assert.Equal(expected, ClientLabel.Describe(userAgent));

    [Fact]
    public async Task Paid_account_with_two_recent_sessions_is_recorded_without_notification_by_default()
    {
        await using var db = CreateDb();
        var user = await AddUser(db, "capitao");
        var current = Guid.NewGuid();
        AddSession(db, user.Id, current, "Chrome no Android", DateTimeOffset.UtcNow);
        AddSession(db, user.Id, Guid.NewGuid(), "Safari no iPhone", DateTimeOffset.UtcNow);
        await db.SaveChangesAsync();
        var notifications = new RecordingNotifications();

        await ConcurrentSessionMonitor.ObserveAsync(db, notifications, user, current, CancellationToken.None);

        Assert.NotNull(user.ConcurrentUseAt);
        Assert.Equal("Chrome no Android e Safari no iPhone", user.ConcurrentUseLabels);
        Assert.Null(user.ConcurrentUseNotifiedOn);
        Assert.Empty(notifications.ConcurrentUses);
    }

    [Fact]
    public async Task Enabled_flag_sends_one_admin_notice_per_sao_paulo_day()
    {
        await using var db = CreateDb(notify: true);
        db.Plans.Add(new Plan { Id = Guid.NewGuid(), Code = "capitao", Name = "Capitão" });
        var user = await AddUser(db, "capitao");
        var current = Guid.NewGuid();
        var other = Guid.NewGuid();
        AddSession(db, user.Id, current, "Chrome no Android", DateTimeOffset.UtcNow);
        AddSession(db, user.Id, other, "Safari no iPhone", DateTimeOffset.UtcNow);
        await db.SaveChangesAsync();
        var notifications = new RecordingNotifications();

        await ConcurrentSessionMonitor.ObserveAsync(db, notifications, user, current, CancellationToken.None);
        await ConcurrentSessionMonitor.ObserveAsync(db, notifications, user, current, CancellationToken.None);

        var notice = Assert.Single(notifications.ConcurrentUses);
        Assert.Equal("Ana", notice.UserName);
        Assert.Equal("Capitão", notice.CurrentPlan);
        Assert.Equal("Chrome no Android e Safari no iPhone", notice.SessionLabels);
        Assert.NotNull(user.ConcurrentUseNotifiedOn);
    }

    [Fact]
    public async Task Same_session_refresh_and_stale_other_session_stay_quiet()
    {
        await using var db = CreateDb(notify: true);
        var user = await AddUser(db, "premium");
        var current = Guid.NewGuid();
        AddSession(db, user.Id, current, "Chrome no Android", DateTimeOffset.UtcNow);
        AddSession(db, user.Id, current, "Chrome no Android", DateTimeOffset.UtcNow, revoked: true);
        AddSession(db, user.Id, Guid.NewGuid(), "Safari no iPhone", DateTimeOffset.UtcNow.AddHours(-2));
        await db.SaveChangesAsync();
        var notifications = new RecordingNotifications();

        await ConcurrentSessionMonitor.ObserveAsync(db, notifications, user, current, CancellationToken.None);

        Assert.Null(user.ConcurrentUseAt);
        Assert.Empty(notifications.ConcurrentUses);
    }

    [Theory]
    [InlineData("free", "User")]
    [InlineData("capitao", "Admin")]
    public async Task Free_and_admin_accounts_are_ignored(string plan, string role)
    {
        await using var db = CreateDb(notify: true);
        var user = await AddUser(db, plan, role);
        var current = Guid.NewGuid();
        AddSession(db, user.Id, current, "Chrome no Android", DateTimeOffset.UtcNow);
        AddSession(db, user.Id, Guid.NewGuid(), "Safari no iPhone", DateTimeOffset.UtcNow);
        await db.SaveChangesAsync();

        await ConcurrentSessionMonitor.ObserveAsync(db, new RecordingNotifications(), user, current, CancellationToken.None);

        Assert.Null(user.ConcurrentUseAt);
    }

    private static TaNoMarDbContext CreateDb(bool notify = false)
    {
        var options = new DbContextOptionsBuilder<TaNoMarDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new TaNoMarDbContext(options);
        db.WhatsAppSettings.Add(new WhatsAppSettings
        {
            Id = Guid.NewGuid(),
            InstanceName = "TaNoMar",
            NotifyConcurrentUse = notify
        });
        db.SaveChanges();
        return db;
    }

    private static async Task<User> AddUser(TaNoMarDbContext db, string plan, string role = "User")
    {
        var user = new User
        {
            GoogleSubject = Guid.NewGuid().ToString(),
            Name = "Ana",
            Email = $"{Guid.NewGuid():N}@example.com",
            PlanCode = plan,
            Role = role
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private static void AddSession(TaNoMarDbContext db, Guid userId, Guid sessionId, string label, DateTimeOffset seenAt, bool revoked = false) =>
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            SessionId = sessionId,
            TokenHash = Guid.NewGuid().ToString("N"),
            ClientLabel = label,
            CreatedAt = seenAt,
            LastSeenAt = seenAt,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(30),
            RevokedAt = revoked ? DateTimeOffset.UtcNow : null
        });

    private sealed class RecordingNotifications : IAdminNotificationService
    {
        public List<AdminNotification> ConcurrentUses { get; } = [];

        public void NotifyConcurrentUse(string name, string email, string plan, string sessionLabels, DateTimeOffset occurredAt) =>
            ConcurrentUses.Add(new AdminNotification(
                AdminNotificationKind.ConcurrentUse,
                name,
                email,
                occurredAt,
                CurrentPlan: plan,
                SessionLabels: sessionLabels));

        public void NotifyNewUserRegistered(string name, string email, DateTimeOffset occurredAt, int totalUsers) { }
        public void NotifyPlanRequested(string name, string email, string currentPlan, string requestedPlan, string cycle, int priceCents, DateTimeOffset occurredAt) { }
        public void NotifyPartnerRequested(string userName, string userEmail, string partnerName, string category, string city, string whatsApp, DateTimeOffset occurredAt) { }
        public void NotifyPlanPaid(string name, string email, string currentPlan, string paidPlan, string cycle, int priceCents, DateTimeOffset occurredAt) { }
        public void NotifyUserPlanChanged(string name, string email, string currentPlan, string newPlan, DateTimeOffset occurredAt) { }
        public void NotifyRenewalCanceled(string name, string email, string plan, string cycle, DateTimeOffset? accessUntil, DateTimeOffset occurredAt) { }
    }
}
