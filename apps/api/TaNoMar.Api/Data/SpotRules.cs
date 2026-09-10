using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace TaNoMar.Api.Data;

internal static class SpotRules
{
    public static readonly string[] Profiles = ["praia_aberta", "praia_semi_aberta", "praia_protegida"];
    public static readonly string[] ReportTypes = ["condicao", "perigo"];

    public static bool CanSee(FishingSpot spot, User user) =>
        Owns(spot, user)
        || (IsCommunityVisible(spot) && IsIncludedInPlan(spot, user.PlanCode));

    public static bool IsCommunityVisible(FishingSpot spot) =>
        (spot.Visibility == "official" && spot.IsActive)
        || (spot.Visibility == "shared" && spot.IsApproved);

    public static bool IsIncludedInPlan(FishingSpot spot, string? planCode) =>
        spot.Visibility != "official"
        || spot.IsFreeDefault
        || PlanRules.IsPaid(planCode);

    public static bool EnabledByDefault(FishingSpot spot) =>
        IsCommunityVisible(spot) || spot.OwnerUserId is not null;

    public static bool IsEnabledForUser(FishingSpot spot, IReadOnlyDictionary<Guid, bool> settings) =>
        settings.TryGetValue(spot.Id, out var enabled) ? enabled : EnabledByDefault(spot);

    public static bool IsInPreferredRegion(FishingSpot spot, string? preferredRegions) =>
        IsInPreferredRegion(spot.Region, preferredRegions);

    public static bool IsInPreferredRegion(string spotRegion, string? preferredRegions)
    {
        var regions = preferredRegions?.Split('|', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries) ?? [];
        return regions.Length == 0
            || regions.Any(IsEntireIsland)
            || regions.Contains(spotRegion, StringComparer.OrdinalIgnoreCase);
    }

    public static bool IsAdmin(User user) =>
        string.Equals(user.Role, "Admin", StringComparison.Ordinal);

    public static bool Owns(FishingSpot spot, User user) => Owns(spot, user.Id);

    public static bool Owns(FishingSpot spot, Guid userId) => spot.OwnerUserId == userId;

    public static string NormalizeProfile(string? profile) =>
        profile is not null && Profiles.Contains(profile, StringComparer.Ordinal) ? profile : "praia_aberta";

    public static string Slugify(string name)
    {
        var normalized = name.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var character in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(character);
            if (category == UnicodeCategory.NonSpacingMark) continue;
            if (char.IsLetterOrDigit(character)) builder.Append(character);
            else if (character is ' ' or '-' or '_') builder.Append('-');
        }

        var slug = Regex.Replace(builder.ToString().Normalize(NormalizationForm.FormC), "-{2,}", "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? "local" : slug;
    }

    public static bool ForecastInputsChanged(FishingSpot spot, double latitude, double longitude, double seaOrientationDegrees, string? profile)
    {
        var normalizedProfile = NormalizeProfile(profile);
        return spot.Latitude != latitude
            || spot.Longitude != longitude
            || spot.SeaOrientationDegrees != seaOrientationDegrees
            || !string.Equals(spot.Profile, normalizedProfile, StringComparison.Ordinal);
    }

    public static bool IsValidIdealWindDirection(int? degrees) =>
        degrees is null || degrees is >= 0 and < 360 && degrees % 45 == 0;

    public static bool IsValidReportType(string type) =>
        ReportTypes.Contains(type, StringComparer.OrdinalIgnoreCase);

    private static bool IsEntireIsland(string region) =>
        string.Equals(region, "Florianópolis", StringComparison.OrdinalIgnoreCase)
        || string.Equals(region, "Meu mapa", StringComparison.OrdinalIgnoreCase)
        || string.Equals(region, "Ilha de Santa Catarina", StringComparison.OrdinalIgnoreCase);

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
