namespace TaNoMar.Monitor.Configuration;

public sealed class WhatsAppOptions
{
    public string BaseUrl { get; set; } = "http://tanomar-whatsapp:3000";
    public string ApiKey { get; set; } = string.Empty;
    public string DestinationId { get; set; } = string.Empty;
    public int StatusTimeoutSeconds { get; set; } = 5;
    public int SendTimeoutSeconds { get; set; } = 15;

    public void Validate()
    {
        var errors = new List<string>();
        if (StatusTimeoutSeconds < 1) errors.Add("WhatsApp:StatusTimeoutSeconds deve ser >= 1.");
        if (SendTimeoutSeconds < 1) errors.Add("WhatsApp:SendTimeoutSeconds deve ser >= 1.");
        MonitoringOptions.ValidateUrl(BaseUrl, "WHATSAPP_BASE_URL", errors);
        if (string.IsNullOrWhiteSpace(ApiKey)) errors.Add("WHATSAPP_API_KEY é obrigatório.");
        if (string.IsNullOrWhiteSpace(DestinationId)) errors.Add("WHATSAPP_DESTINATION_ID é obrigatório.");
        MonitoringOptions.ThrowIfInvalid(errors);
    }
}
