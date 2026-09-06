namespace TaNoMar.Api.Data;

internal static class SpotRules
{
    public static readonly string[] Profiles = ["praia_aberta", "praia_semi_aberta", "praia_protegida"];
    public static readonly string[] ReportTypes = ["condicao", "perigo"];

    public static bool CanSee(FishingSpot spot, User user) =>
        spot.Visibility == "official"
        || (spot.Visibility == "shared" && spot.IsApproved)
        || spot.OwnerUserId == user.Id;

    public static bool IsCommunityVisible(FishingSpot spot) =>
        spot.Visibility == "official" || (spot.Visibility == "shared" && spot.IsApproved);

    public static bool EnabledByDefault(FishingSpot spot) =>
        IsCommunityVisible(spot) || spot.OwnerUserId is not null;

    public static bool IsEnabledForUser(FishingSpot spot, IReadOnlyDictionary<Guid, bool> settings) =>
        settings.TryGetValue(spot.Id, out var enabled) ? enabled : EnabledByDefault(spot);

    public static bool IsAdmin(User user) =>
        string.Equals(user.Role, "Admin", StringComparison.Ordinal);

    public static bool Owns(FishingSpot spot, User user) => spot.OwnerUserId == user.Id;

    public static string NormalizeProfile(string? profile) =>
        profile is not null && Profiles.Contains(profile, StringComparer.Ordinal) ? profile : "praia_aberta";

    public static bool IsValidReportType(string type) =>
        ReportTypes.Contains(type, StringComparer.OrdinalIgnoreCase);

    public static string? NormalizeReportComment(string? comment)
    {
        var trimmed = comment?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    public static (DateTimeOffset StartUtc, DateTimeOffset EndUtc) SaoPauloDayUtcRange(DateTimeOffset utcNow)
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
        var local = TimeZoneInfo.ConvertTime(utcNow, zone);
        var startLocal = new DateTimeOffset(local.Year, local.Month, local.Day, 0, 0, 0, local.Offset);
        return (startLocal.ToUniversalTime(), startLocal.AddDays(1).ToUniversalTime());
    }
}
