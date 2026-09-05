namespace TaNoMar.Api.Options;

public sealed class TaNoMarOptions
{
    public const string SectionName = "TaNoMar";
    public const string RefreshCookieName = "tanomar_refresh";

    public string GoogleClientId { get; set; } = string.Empty;
    public string JwtIssuer { get; set; } = "tanomar";
    public string JwtKey { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 30;
    public string BootstrapAdminEmail { get; set; } = string.Empty;
    public string BootstrapAdminGoogleSubject { get; set; } = string.Empty;
    public string AuditFile { get; set; } = "/var/lib/tanomar/audit.jsonl";
    public string VapidPublicKey { get; set; } = string.Empty;
    public string VapidPrivateKey { get; set; } = string.Empty;
    public string VapidSubject { get; set; } = string.Empty;

    public bool HasVapid =>
        !string.IsNullOrWhiteSpace(VapidPublicKey)
        && !string.IsNullOrWhiteSpace(VapidPrivateKey)
        && !string.IsNullOrWhiteSpace(VapidSubject);
}
