namespace TaNoMar.Api.Workers;

public sealed class WorkerConfiguration
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Key { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public string? CronExpression { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
