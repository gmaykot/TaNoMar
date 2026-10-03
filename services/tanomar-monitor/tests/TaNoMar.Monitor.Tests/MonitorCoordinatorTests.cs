using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using TaNoMar.Monitor.Configuration;
using TaNoMar.Monitor.Monitoring;
using TaNoMar.Monitor.Persistence;
using Xunit;

namespace TaNoMar.Monitor.Tests;

public sealed class MonitorCoordinatorTests
{
    [Fact]
    public async Task Three_failures_transition_to_down_and_send_once()
    {
        var (coordinator, check, alerts) = Create(failures: 3);
        await coordinator.RunCheckAsync(check, CancellationToken.None);
        await coordinator.RunCheckAsync(check, CancellationToken.None);
        Assert.Empty(alerts.Down);
        await coordinator.RunCheckAsync(check, CancellationToken.None);
        await coordinator.RunCheckAsync(check, CancellationToken.None);
        var state = (await coordinator.GetStatesAsync(CancellationToken.None)).Single();
        Assert.Equal(CheckStatus.Down, state.Status);
        Assert.Single(alerts.Down);
    }

    [Fact]
    public async Task Two_successes_recover_and_send_once()
    {
        var (coordinator, check, alerts) = Create(failures: 3);
        for (var i = 0; i < 3; i++) await coordinator.RunCheckAsync(check, CancellationToken.None);
        check.Success = true;
        await coordinator.RunCheckAsync(check, CancellationToken.None);
        Assert.Empty(alerts.Recovery);
        await coordinator.RunCheckAsync(check, CancellationToken.None);
        await coordinator.RunCheckAsync(check, CancellationToken.None);
        Assert.Single(alerts.Recovery);
        Assert.Equal(CheckStatus.Healthy, (await coordinator.GetStatesAsync(CancellationToken.None)).Single().Status);
    }

    [Fact]
    public async Task Persisted_down_state_does_not_repeat_alert_after_new_coordinator()
    {
        var dbName = Guid.NewGuid().ToString();
        var (coordinator, check, alerts) = Create(failures: 3, dbName: dbName);
        for (var i = 0; i < 3; i++) await coordinator.RunCheckAsync(check, CancellationToken.None);
        var (second, secondCheck, secondAlerts) = Create(failures: 3, alerts: alerts, dbName: dbName);
        await second.RunCheckAsync(secondCheck, CancellationToken.None);
        Assert.Single(secondAlerts.Down);
    }

    [Fact]
    public async Task New_incident_after_recovery_sends_a_new_down_alert()
    {
        var (coordinator, check, alerts) = Create(failures: 3);
        for (var i = 0; i < 3; i++) await coordinator.RunCheckAsync(check, CancellationToken.None);
        check.Success = true;
        for (var i = 0; i < 2; i++) await coordinator.RunCheckAsync(check, CancellationToken.None);
        check.Success = false;
        for (var i = 0; i < 3; i++) await coordinator.RunCheckAsync(check, CancellationToken.None);
        Assert.Equal(2, alerts.Down.Count);
        Assert.Single(alerts.Recovery);
    }

    [Fact]
    public async Task Disabled_retry_does_not_attempt_alert_again()
    {
        var (coordinator, check, alerts) = Create(failures: 3, retryEnabled: false, alertResult: AlertDeliveryResult.TransientFailure());
        for (var i = 0; i < 4; i++) await coordinator.RunCheckAsync(check, CancellationToken.None);
        Assert.Single(alerts.Down);
    }

    [Fact]
    public async Task Zero_additional_retries_keeps_one_initial_attempt()
    {
        var (coordinator, check, alerts) = Create(failures: 3, maxRetryAttempts: 0, alertResult: AlertDeliveryResult.TransientFailure());
        for (var i = 0; i < 4; i++) await coordinator.RunCheckAsync(check, CancellationToken.None);
        Assert.Single(alerts.Down);
    }

    private static (MonitorCoordinator Coordinator, FakeCheck Check, FakeAlerts Alerts) Create(int failures, FakeAlerts? alerts = null, string? dbName = null, bool retryEnabled = true, int maxRetryAttempts = 3, AlertDeliveryResult? alertResult = null)
    {
        var factory = new TestFactory(dbName ?? Guid.NewGuid().ToString());
        var check = new FakeCheck { Success = false, Failures = failures };
        alerts ??= new FakeAlerts { Result = alertResult ?? AlertDeliveryResult.Success() };
        var options = new MonitoringOptions { FailureThreshold = 3, RecoveryThreshold = 2 };
        return (new MonitorCoordinator(factory, [check], alerts, options, new AlertOptions { RetryEnabled = retryEnabled, MaxRetryAttempts = maxRetryAttempts }, NullLogger<MonitorCoordinator>.Instance), check, alerts);
    }

    private sealed class TestFactory(string name) : IDbContextFactory<MonitorDbContext>
    {
        public MonitorDbContext CreateDbContext() => new(new DbContextOptionsBuilder<MonitorDbContext>().UseInMemoryDatabase(name).Options);
        public Task<MonitorDbContext> CreateDbContextAsync(CancellationToken _) => Task.FromResult(CreateDbContext());
    }

    private sealed class FakeCheck : IMonitorCheck
    {
        public bool Success { get; set; }
        public int Failures { get; set; }
        public string Name => "Test";
        public string Url => "https://test";
        public Task<CheckResult> ExecuteAsync(CancellationToken _) => Task.FromResult(Success ? CheckResult.Ok(1) : CheckResult.Failed("falha"));
    }

    private sealed class FakeAlerts : IAlertSender
    {
        public AlertDeliveryResult Result { get; init; } = AlertDeliveryResult.Success();
        public List<string> Down { get; } = [];
        public List<string> Recovery { get; } = [];
        public Task<AlertDeliveryResult> SendDownAsync(MonitorCheckState state, string _, CancellationToken __) { Down.Add(state.Name); return Task.FromResult(Result); }
        public Task<AlertDeliveryResult> SendRecoveryAsync(MonitorCheckState state, CancellationToken _) { Recovery.Add(state.Name); return Task.FromResult(Result); }
    }
}
