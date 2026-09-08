namespace TaNoMar.Api.Billing;

public sealed class BillingOptions
{
    public const string SectionName = "Billing";
    public const int AnnualDiscountPercent = 20;
    public const int CheckoutMinutesToExpire = 60;
    public const int PastDueGraceDays = 3;

    public string AsaasApiKey { get; set; } = string.Empty;
    public string AsaasBaseUrl { get; set; } = "https://api.asaas.com/v3";
    public string AsaasWebhookToken { get; set; } = string.Empty;
    public string PublicAppOrigin { get; set; } = string.Empty;

    public bool Enabled => !string.IsNullOrWhiteSpace(AsaasApiKey);

    public bool IsSandbox =>
        AsaasBaseUrl.Contains("sandbox", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Docker Compose interpola `$` no `.env`. No Coolify a chave pode ir sem o prefixo `$`;
    /// a API recoloca `$aact_` antes de chamar o Asaas.
    /// </summary>
    public static string NormalizeApiKey(string? value)
    {
        var key = value?.Trim() ?? string.Empty;
        if (key.StartsWith("aact_", StringComparison.Ordinal))
            return "$" + key;
        return key;
    }
}
