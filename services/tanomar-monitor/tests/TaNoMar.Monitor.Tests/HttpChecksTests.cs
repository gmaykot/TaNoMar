using Microsoft.Extensions.Logging.Abstractions;
using System.Net;
using TaNoMar.Monitor.Checks;
using TaNoMar.Monitor.Configuration;
using TaNoMar.Monitor.Monitoring;
using TaNoMar.Monitor.Notifications;
using Xunit;

namespace TaNoMar.Monitor.Tests;

public sealed class HttpChecksTests
{
    [Fact]
    public async Task Web_accepts_expected_content()
    {
        using var client = new HttpClient(new Handler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("TaNoMar online") })));
        var result = await new HttpMonitorCheck("Web", "https://web", "TaNoMar", client).ExecuteAsync(CancellationToken.None);
        Assert.True(result.Success);
        Assert.NotNull(result.LatencyMs);
    }

    [Fact]
    public async Task Web_requires_expected_content()
    {
        using var client = new HttpClient(new Handler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("home") })));
        var result = await new HttpMonitorCheck("Web", "https://web", "TaNoMar", client).ExecuteAsync(CancellationToken.None);
        Assert.False(result.Success);
        Assert.Contains("Conteúdo", result.Error);
    }

    [Fact]
    public async Task Timeout_is_reported_as_failure()
    {
        using var client = new HttpClient(new Handler(async (_, token) => { await Task.Delay(1000, token); return new HttpResponseMessage(HttpStatusCode.OK); }));
        using var cancellation = new CancellationTokenSource(TimeSpan.FromMilliseconds(10));
        var result = await new HttpMonitorCheck("Web", "https://web", null, client).ExecuteAsync(cancellation.Token);
        Assert.False(result.Success);
    }

    [Fact]
    public async Task Http_500_and_connection_errors_are_failures()
    {
        using var errorClient = new HttpClient(new Handler((_, _) => throw new HttpRequestException("connection refused")));
        var connection = await new HttpMonitorCheck("API", "https://api", null, errorClient).ExecuteAsync(CancellationToken.None);
        Assert.False(connection.Success);

        using var statusClient = new HttpClient(new Handler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError))));
        var serverError = await new HttpMonitorCheck("API", "https://api", null, statusClient).ExecuteAsync(CancellationToken.None);
        Assert.False(serverError.Success);
        Assert.Contains("500", serverError.Error);
    }

    [Fact]
    public async Task Oversized_body_is_rejected()
    {
        using var client = new HttpClient(new Handler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(new string('x', 1_048_577)) })));
        var result = await new HttpMonitorCheck("Web", "https://web", null, client).ExecuteAsync(CancellationToken.None);
        Assert.False(result.Success);
        Assert.Contains("1 MB", result.Error);
    }

    private sealed class Handler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handler) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => handler(request, cancellationToken);
    }
}

public sealed class WhatsAppAlertSenderTests
{
    [Theory]
    [InlineData(HttpStatusCode.BadRequest, false)]
    [InlineData(HttpStatusCode.Unauthorized, false)]
    [InlineData(HttpStatusCode.ServiceUnavailable, true)]
    public async Task Send_http_errors_are_classified_without_retrying_inside_sender(HttpStatusCode sendStatus, bool retryable)
    {
        var requests = new List<HttpRequestMessage>();
        using var client = new HttpClient(new Handler(requests, request => request.RequestUri!.AbsolutePath == "/status"
            ? Json(HttpStatusCode.OK, "{\"state\":\"connected\"}")
            : Json(sendStatus, "{}"))) { BaseAddress = new("http://whatsapp") };
        var sender = new WhatsAppAlertSender(client, client, new WhatsAppOptions { ApiKey = "key", DestinationId = "x@s.whatsapp.net" }, NullLogger<WhatsAppAlertSender>.Instance);
        var result = await sender.SendDownAsync(new MonitorCheckState { Name = "API", LastFailureAt = DateTimeOffset.UtcNow, LastError = "falha", ConsecutiveFailures = 3 }, "https://api", CancellationToken.None);
        Assert.False(result.Succeeded);
        Assert.Equal(retryable, result.Retryable);
        Assert.Equal(2, requests.Count);
    }

    [Fact]
    public async Task Sends_only_when_whatsapp_is_connected()
    {
        var requests = new List<HttpRequestMessage>();
        using var client = new HttpClient(new Handler(requests, request => request.RequestUri!.AbsolutePath == "/status"
            ? Json(HttpStatusCode.OK, "{\"state\":\"disconnected\"}")
            : Json(HttpStatusCode.OK, "{}"))) { BaseAddress = new("http://whatsapp") };
        var sender = new WhatsAppAlertSender(client, client, new WhatsAppOptions { ApiKey = "key", DestinationId = "x@s.whatsapp.net" }, NullLogger<WhatsAppAlertSender>.Instance);
        var sent = await sender.SendDownAsync(new MonitorCheckState { Name = "API", LastFailureAt = DateTimeOffset.UtcNow, LastError = "falha", ConsecutiveFailures = 3 }, "https://api", CancellationToken.None);
        Assert.False(sent.Succeeded);
        Assert.Single(requests);
    }

    [Fact]
    public async Task Connected_status_is_followed_by_one_send()
    {
        var requests = new List<HttpRequestMessage>();
        using var client = new HttpClient(new Handler(requests, request => request.RequestUri!.AbsolutePath == "/status"
            ? Json(HttpStatusCode.OK, "{\"state\":\"connected\"}")
            : Json(HttpStatusCode.OK, "{}"))) { BaseAddress = new("http://whatsapp") };
        var sender = new WhatsAppAlertSender(client, client, new WhatsAppOptions { ApiKey = "key", DestinationId = "x@s.whatsapp.net" }, NullLogger<WhatsAppAlertSender>.Instance);
        Assert.True((await sender.SendDownAsync(new MonitorCheckState { Name = "API", LastFailureAt = DateTimeOffset.UtcNow, LastError = "falha", ConsecutiveFailures = 3 }, "https://api", CancellationToken.None)).Succeeded);
        Assert.Equal(["/status", "/send"], requests.Select(x => x.RequestUri!.AbsolutePath));
    }

    private static HttpResponseMessage Json(HttpStatusCode status, string body) => new(status) { Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json") };
    private sealed class Handler(List<HttpRequestMessage> requests, Func<HttpRequestMessage, HttpResponseMessage> handler) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken _) { requests.Add(request); return Task.FromResult(handler(request)); }
    }
}
