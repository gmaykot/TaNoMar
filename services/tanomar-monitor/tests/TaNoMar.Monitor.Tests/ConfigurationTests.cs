using TaNoMar.Monitor.Configuration;
using Xunit;

namespace TaNoMar.Monitor.Tests;

public sealed class ConfigurationTests
{
    [Fact]
    public void Defaults_are_operationally_safe()
    {
        var monitoring = new MonitoringOptions();
        var whatsapp = new WhatsAppOptions { ApiKey = "key", DestinationId = "x@s.whatsapp.net" };
        var alerts = new AlertOptions();
        Assert.Equal(60, monitoring.IntervalSeconds);
        Assert.Equal(3, monitoring.FailureThreshold);
        Assert.Equal(2, monitoring.RecoveryThreshold);
        Assert.Equal(10, monitoring.HttpTimeoutSeconds);
        Assert.Equal(5, whatsapp.StatusTimeoutSeconds);
        Assert.Equal(15, whatsapp.SendTimeoutSeconds);
        Assert.True(alerts.RetryEnabled);
        Assert.Equal(300, alerts.RetryIntervalSeconds);
        Assert.Equal(3, alerts.MaxRetryAttempts);
    }

    [Fact]
    public void Operational_values_can_be_overridden()
    {
        var monitoring = new MonitoringOptions { IntervalSeconds = 30, FailureThreshold = 2, RecoveryThreshold = 4, HttpTimeoutSeconds = 7 };
        var whatsapp = new WhatsAppOptions { StatusTimeoutSeconds = 2, SendTimeoutSeconds = 9, ApiKey = "key", DestinationId = "x@s.whatsapp.net" };
        var alerts = new AlertOptions { RetryEnabled = false, RetryIntervalSeconds = 1, MaxRetryAttempts = 0 };
        monitoring.Validate();
        whatsapp.Validate();
        alerts.Validate();
        Assert.Equal(30, monitoring.IntervalSeconds);
        Assert.Equal(2, monitoring.FailureThreshold);
        Assert.Equal(4, monitoring.RecoveryThreshold);
        Assert.Equal(7, monitoring.HttpTimeoutSeconds);
        Assert.Equal(2, whatsapp.StatusTimeoutSeconds);
        Assert.Equal(9, whatsapp.SendTimeoutSeconds);
        Assert.False(alerts.RetryEnabled);
    }
    [Fact]
    public void Invalid_threshold_and_urls_fail_without_secret_in_error()
    {
        var options = new MonitoringOptions { IntervalSeconds = 0, WebUrl = "not-a-url" };
        var exception = Assert.Throws<InvalidOperationException>(() => options.Validate());
        Assert.Contains("IntervalSeconds", exception.Message);
        Assert.Contains("TANOMAR_WEB_URL", exception.Message);
        Assert.DoesNotContain("secret", exception.Message);
    }

    [Fact]
    public void Retry_interval_is_only_required_when_retry_is_enabled()
    {
        new AlertOptions { RetryEnabled = false, RetryIntervalSeconds = 0, MaxRetryAttempts = 0 }.Validate();
        Assert.Throws<InvalidOperationException>(() => new AlertOptions { RetryEnabled = true, RetryIntervalSeconds = 9 }.Validate());
    }
}
