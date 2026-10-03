namespace TaNoMar.Monitor.Monitoring;

public enum CheckStatus { Unknown, Healthy, Down }

public sealed class CheckResult(bool success, long? latencyMs, string? error)
{
    public bool Success { get; } = success;
    public long? LatencyMs { get; } = latencyMs;
    public string? Error { get; } = error;
    public static CheckResult Ok(long latencyMs) => new(true, latencyMs, null);
    public static CheckResult Failed(string error, long? latencyMs = null) => new(false, latencyMs, error);
}

public sealed class MonitorCheckState
{
    public string Name { get; set; } = string.Empty;
    public CheckStatus Status { get; set; }
    public int ConsecutiveFailures { get; set; }
    public int ConsecutiveSuccesses { get; set; }
    public DateTimeOffset? LastCheckAt { get; set; }
    public DateTimeOffset? LastSuccessAt { get; set; }
    public DateTimeOffset? LastFailureAt { get; set; }
    public DateTimeOffset? OutageStartedAt { get; set; }
    public long? LastLatencyMs { get; set; }
    public string? LastError { get; set; }
    public bool DownAlertSent { get; set; }
    public int DownAlertAttempts { get; set; }
    public DateTimeOffset? LastDownAlertAttemptAt { get; set; }
    public bool RecoveryAlertSent { get; set; }
    public int RecoveryAlertAttempts { get; set; }
    public DateTimeOffset? LastRecoveryAlertAttemptAt { get; set; }
}

public interface IMonitorCheck
{
    string Name { get; }
    string Url { get; }
    Task<CheckResult> ExecuteAsync(CancellationToken cancellationToken);
}

public interface IAlertSender
{
    Task<AlertDeliveryResult> SendDownAsync(MonitorCheckState state, string url, CancellationToken cancellationToken);
    Task<AlertDeliveryResult> SendRecoveryAsync(MonitorCheckState state, CancellationToken cancellationToken);
}

public sealed record AlertDeliveryResult(bool Succeeded, bool Retryable)
{
    public static AlertDeliveryResult Success() => new(true, false);
    public static AlertDeliveryResult PermanentFailure() => new(false, false);
    public static AlertDeliveryResult TransientFailure() => new(false, true);
}
