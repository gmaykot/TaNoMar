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

    public static bool IsAdmin(User user) =>
        string.Equals(user.Role, "Admin", StringComparison.Ordinal);

    public static bool Owns(FishingSpot spot, User user) => spot.OwnerUserId == user.Id;

    public static string NormalizeProfile(string? profile) =>
        profile is not null && Profiles.Contains(profile, StringComparer.Ordinal) ? profile : "praia_aberta";

    public static bool IsValidReportType(string type) =>
        ReportTypes.Contains(type, StringComparer.OrdinalIgnoreCase);
}
