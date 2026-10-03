namespace TaNoMar.Monitor.Configuration;

public sealed class AlertOptions
{
    public bool RetryEnabled { get; set; } = true;
    public int RetryIntervalSeconds { get; set; } = 300;
    public int MaxRetryAttempts { get; set; } = 3;

    public void Validate()
    {
        var errors = new List<string>();
        if (MaxRetryAttempts < 0) errors.Add("Alerts:MaxRetryAttempts deve ser >= 0.");
        if (RetryEnabled && RetryIntervalSeconds < 10) errors.Add("Alerts:RetryIntervalSeconds deve ser >= 10 quando retry estiver habilitado.");
        MonitoringOptions.ThrowIfInvalid(errors);
    }
}
