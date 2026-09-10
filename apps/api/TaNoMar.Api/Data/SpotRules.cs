using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace TaNoMar.Api.Data;

internal static class SpotRules
{
    public const string EntireIslandPreference = "Ilha de Santa Catarina";
    public const string DefaultType = "praia";
    public const string DefaultProfile = "praia_aberta";
    public const string DefaultFishingEnvironment = "mar_aberto";
    public const string DefaultAccessType = "terrestre";

    public static readonly string[] Profiles = ["praia_aberta", "praia_semi_aberta", "praia_protegida"];
    public static readonly string[] Types = ["praia", "costao", "canal", "lagoa", "rio", "estuario", "ilha", "pier", "outro"];
    public static readonly string[] FishingEnvironments = ["mar_aberto", "baia", "lagunar", "estuarino", "fluvial"];
    public static readonly string[] AccessTypes = ["terrestre", "trilha", "embarcado", "caiaque", "misto"];
    public static readonly string[] Regions = ["norte", "sul", "leste", "oeste", "continente", "ilhas"];
    public static readonly string[] IslandQuadrants = ["norte", "sul", "leste", "oeste"];
    public static readonly string[] ReportTypes = ["condicao", "perigo"];

    private static readonly Dictionary<string, string> RegionAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["norte"] = "norte",
        ["norte da ilha"] = "norte",
        ["sul"] = "sul",
        ["sul da ilha"] = "sul",
        ["leste"] = "leste",
        ["leste da ilha"] = "leste",
        ["oeste"] = "oeste",
        ["oeste da ilha"] = "oeste",
        ["continente"] = "continente",
        ["ilhas"] = "ilhas",
        ["ilha de santa catarina"] = EntireIslandPreference,
        ["florianópolis"] = EntireIslandPreference,
        ["florianopolis"] = EntireIslandPreference,
        ["meu mapa"] = EntireIslandPreference
    };

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
        var regions = SplitRegions(preferredRegions);
        if (regions.Length == 0) return true;
        var normalizedSpot = NormalizeRegion(spotRegion);
        if (string.IsNullOrEmpty(normalizedSpot)) return true;
        return regions.Any(region =>
            (IsEntireIsland(region) && IslandQuadrants.Contains(normalizedSpot, StringComparer.Ordinal))
            || string.Equals(NormalizeRegion(region), normalizedSpot, StringComparison.OrdinalIgnoreCase));
    }

    public static bool IsAdmin(User user) =>
        string.Equals(user.Role, "Admin", StringComparison.Ordinal);

    public static bool Owns(FishingSpot spot, User user) => Owns(spot, user.Id);

    public static bool Owns(FishingSpot spot, Guid userId) => spot.OwnerUserId == userId;

    public static bool HasCoordinates(FishingSpot spot) =>
        spot.Latitude is not null && spot.Longitude is not null;

    public static string NormalizeProfile(string? profile) =>
        profile is not null && Profiles.Contains(profile, StringComparer.Ordinal) ? profile : DefaultProfile;

    public static string NormalizeType(string? type)
    {
        if (type is not null && Types.Contains(type, StringComparer.Ordinal)) return type;
        if (string.Equals(type, "personalizado", StringComparison.OrdinalIgnoreCase)) return "outro";
        return DefaultType;
    }

    public static string NormalizeFishingEnvironment(string? value) =>
        value is not null && FishingEnvironments.Contains(value, StringComparer.Ordinal) ? value : DefaultFishingEnvironment;

    public static string NormalizeAccessType(string? value) =>
        value is not null && AccessTypes.Contains(value, StringComparer.Ordinal) ? value : DefaultAccessType;

    public static string NormalizeRegion(string? region)
    {
        var trimmed = region?.Trim() ?? string.Empty;
        if (trimmed.Length == 0) return string.Empty;
        return RegionAliases.TryGetValue(trimmed, out var mapped) ? mapped : trimmed;
    }

    public static bool IsValidSpotRegion(string? region)
    {
        var normalized = NormalizeRegion(region);
        return Regions.Contains(normalized, StringComparer.Ordinal);
    }

    public static bool IsEntireIsland(string region) =>
        string.Equals(NormalizeRegion(region), EntireIslandPreference, StringComparison.OrdinalIgnoreCase);

    public static string? NormalizeRestrictionNotes(string? notes)
    {
        var trimmed = notes?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

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

    public static bool ForecastInputsChanged(
        FishingSpot spot,
        double? latitude,
        double? longitude,
        double? seaOrientationDegrees,
        string? profile)
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

    private static string[] SplitRegions(string? preferredRegions) =>
        preferredRegions?.Split('|', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries) ?? [];
}
