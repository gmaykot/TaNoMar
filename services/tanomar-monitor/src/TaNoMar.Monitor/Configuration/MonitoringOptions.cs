namespace TaNoMar.Monitor.Configuration;

public sealed class MonitoringOptions
{
    public int IntervalSeconds { get; set; } = 60;
    public int FailureThreshold { get; set; } = 3;
    public int RecoveryThreshold { get; set; } = 2;
    public int HttpTimeoutSeconds { get; set; } = 10;
    public string WebUrl { get; set; } = "https://tanomar.app";
    public string? WebExpectedContent { get; set; } = "TaNoMar";
    public string ApiUrl { get; set; } = "https://tanomar.app/health/ready";
    public string DatabasePath { get; set; } = "/app/data/tanomar-monitor.db";

    public void Validate()
    {
        var errors = new List<string>();
        if (IntervalSeconds < 10) errors.Add("Monitoring:IntervalSeconds deve ser >= 10.");
        if (FailureThreshold < 1) errors.Add("Monitoring:FailureThreshold deve ser >= 1.");
        if (RecoveryThreshold < 1) errors.Add("Monitoring:RecoveryThreshold deve ser >= 1.");
        if (HttpTimeoutSeconds < 2) errors.Add("Monitoring:HttpTimeoutSeconds deve ser >= 2.");
        ValidateUrl(WebUrl, "TANOMAR_WEB_URL", errors);
        ValidateUrl(ApiUrl, "TANOMAR_API_URL", errors);
        if (string.IsNullOrWhiteSpace(DatabasePath)) errors.Add("MONITOR_DATABASE_PATH é obrigatório.");
        ThrowIfInvalid(errors);
    }

    internal static void ValidateUrl(string value, string name, ICollection<string> errors)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https") || string.IsNullOrWhiteSpace(uri.Host))
            errors.Add($"{name} deve ser uma URL HTTP/HTTPS válida.");
    }

    internal static void ThrowIfInvalid(IReadOnlyCollection<string> errors)
    {
        if (errors.Count > 0) throw new InvalidOperationException($"Configuração inválida do TaNoMar Monitor: {string.Join(" ", errors)}");
    }
}
