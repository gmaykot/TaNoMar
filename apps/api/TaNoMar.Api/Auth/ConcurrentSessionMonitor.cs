using Microsoft.EntityFrameworkCore;
using TaNoMar.Api.Data;
using TaNoMar.Api.Notifications;

namespace TaNoMar.Api.Auth;

internal static class ClientLabel
{
    public static string Describe(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent)) return "Navegador desconhecido";
        return $"{Browser(userAgent)} no {SystemName(userAgent)}";
    }

    private static string Browser(string userAgent)
    {
        if (Contains(userAgent, "Edg/") || Contains(userAgent, "Edge/")) return "Edge";
        if (Contains(userAgent, "OPR/") || Contains(userAgent, "Opera")) return "Opera";
        if (Contains(userAgent, "FxiOS") || Contains(userAgent, "Firefox/")) return "Firefox";
        if (Contains(userAgent, "CriOS") || Contains(userAgent, "Chrome/")) return "Chrome";
        if (Contains(userAgent, "Safari/")) return "Safari";
        return "Navegador";
    }

    private static string SystemName(string userAgent)
    {
        if (Contains(userAgent, "Android")) return "Android";
        if (Contains(userAgent, "iPhone")) return "iPhone";
        if (Contains(userAgent, "iPad")) return "iPad";
        if (Contains(userAgent, "Windows")) return "Windows";
        if (Contains(userAgent, "Mac OS") || Contains(userAgent, "Macintosh")) return "Mac";
        if (Contains(userAgent, "Linux")) return "Linux";
        return "outro sistema";
    }

    private static bool Contains(string value, string fragment) =>
        value.Contains(fragment, StringComparison.OrdinalIgnoreCase);
}

internal static class ConcurrentSessionMonitor
{
    public static readonly TimeSpan Overlap = TimeSpan.FromMinutes(30);
    private static readonly TimeZoneInfo SaoPaulo = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

    public static async Task ObserveAsync(
        TaNoMarDbContext db,
        IAdminNotificationService notifications,
        User user,
        Guid sessionId,
        CancellationToken cancellationToken)
    {
        if (SpotRules.IsAdmin(user) || IsFree(user)) return;

        var now = DateTimeOffset.UtcNow;
        var cutoff = now - Overlap;
        var currentLabel = await db.RefreshTokens.AsNoTracking()
            .Where(item => item.UserId == user.Id && item.SessionId == sessionId && item.RevokedAt == null)
            .OrderByDescending(item => item.LastSeenAt)
            .Select(item => item.ClientLabel)
            .FirstOrDefaultAsync(cancellationToken);
        var otherLabels = await db.RefreshTokens.AsNoTracking()
            .Where(item => item.UserId == user.Id
                && item.SessionId != sessionId
                && item.RevokedAt == null
                && item.ExpiresAt > now
                && item.LastSeenAt != null
                && item.LastSeenAt > cutoff)
            .Select(item => item.ClientLabel)
            .ToListAsync(cancellationToken);
        if (otherLabels.Count == 0) return;

        var summary = Summarize(currentLabel, otherLabels);
        user.ConcurrentUseAt = now;
        user.ConcurrentUseLabels = summary;

        var settings = await db.WhatsAppSettings.AsNoTracking().SingleOrDefaultAsync(cancellationToken);
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(now, SaoPaulo).DateTime);
        if (settings?.NotifyConcurrentUse == true && user.ConcurrentUseNotifiedOn != today)
        {
            var planName = await db.Plans.AsNoTracking()
                .Where(plan => plan.Code == user.PlanCode)
                .Select(plan => plan.Name)
                .FirstOrDefaultAsync(cancellationToken);
            user.ConcurrentUseNotifiedOn = today;
            notifications.NotifyConcurrentUse(
                user.Name,
                user.Email,
                string.IsNullOrWhiteSpace(planName) ? user.PlanCode : planName,
                summary,
                now);
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    internal static string Summarize(string? current, IEnumerable<string?> others)
    {
        var labels = new List<string>();
        Add(labels, current);
        foreach (var other in others) Add(labels, other);
        var distinct = labels.Distinct(StringComparer.Ordinal).Take(3).ToList();
        if (distinct.Count == 0) return "dois acessos";
        if (distinct.Count == 1) return Trim($"dois acessos em {distinct[0]}");
        return Trim(string.Join(" e ", distinct));
    }

    private static void Add(List<string> labels, string? value)
    {
        var label = string.IsNullOrWhiteSpace(value) ? "Navegador desconhecido" : value.Trim();
        labels.Add(label.Length <= 80 ? label : label[..80]);
    }

    private static string Trim(string value) => value.Length <= 160 ? value : value[..160];

    private static bool IsFree(User user) =>
        string.IsNullOrWhiteSpace(user.PlanCode)
        || string.Equals(user.PlanCode, "free", StringComparison.OrdinalIgnoreCase);
}
