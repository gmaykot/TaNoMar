namespace TaNoMar.Api.Models;

public sealed record CommandInfo(string Id, string DisplayName, string Description, string Icon);
public sealed record CommandExecutionResult(string Command, int ExitCode, bool TimedOut, string Output, string Error, DateTimeOffset StartedAt, DateTimeOffset FinishedAt);
public sealed record ConsoleRequest(string Prompt);
public sealed record HealthResponse(string Status, DateTimeOffset UtcNow, string User);
