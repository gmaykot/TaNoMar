using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using TaNoMar.Api.Data;
using TaNoMar.Api.Notifications;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class ResendEmailNotifierTests
{
    [Fact]
    public async Task SendsNewUserNotificationToConfiguredEmail()
    {
        var handler = new RecordingHandler();
        var notifier = CreateNotifier(handler);

        await notifier.SendAsync(NewUserNotification(), CancellationToken.None);

        Assert.Equal("Bearer re_test", handler.Authorization);
        using var payload = JsonDocument.Parse(Assert.Single(handler.Bodies));
        Assert.Equal("TáNoMar <avisos@tanomar.com>", payload.RootElement.GetProperty("from").GetString());
        Assert.Equal("admin@tanomar.com", payload.RootElement.GetProperty("to")[0].GetString());
        Assert.Contains("Maria Silva", payload.RootElement.GetProperty("text").GetString());
        Assert.Contains("maria@example.com", payload.RootElement.GetProperty("text").GetString());
    }

    [Fact]
    public async Task SendsPlanRequestDetails()
    {
        var handler = new RecordingHandler();
        var notifier = CreateNotifier(handler);

        await notifier.SendAsync(new AdminNotification(
            AdminNotificationKind.PlanRequested,
            "João Souza",
            "joao@example.com",
            new DateTimeOffset(2026, 9, 10, 12, 0, 0, TimeSpan.Zero),
            CurrentPlan: "Free",
            RequestedPlan: "Mestre",
            Cycle: "YEARLY",
            PriceCents: 14304), CancellationToken.None);

        using var payload = JsonDocument.Parse(Assert.Single(handler.Bodies));
        var text = payload.RootElement.GetProperty("text").GetString();
        Assert.Contains("Plano atual: Free", text);
        Assert.Contains("Plano solicitado: Mestre", text);
        Assert.Contains("Ciclo: Anual", text);
        Assert.Contains("R$ 143,04", text);
    }

    [Fact]
    public async Task DoesNotCallResendWhenConfigurationIsIncomplete()
    {
        var handler = new RecordingHandler();
        var notifier = new ResendEmailNotifier(
            new HttpClient(handler) { BaseAddress = new Uri("https://api.resend.com/") },
            CreateDb(),
            Microsoft.Extensions.Options.Options.Create(new ResendOptions()),
            new AdminNotificationFormatter(),
            NullLogger<ResendEmailNotifier>.Instance);

        await notifier.SendAsync(NewUserNotification(), CancellationToken.None);

        Assert.Empty(handler.Bodies);
    }

    [Fact]
    public async Task DoesNotCallResendWhenEmailChannelIsDisabled()
    {
        var handler = new RecordingHandler();
        var notifier = CreateNotifier(handler, notifyByEmail: false);

        await notifier.SendAsync(NewUserNotification(), CancellationToken.None);

        Assert.Empty(handler.Bodies);
    }

    private static ResendEmailNotifier CreateNotifier(
        RecordingHandler handler,
        bool notifyByEmail = true) => new(
        new HttpClient(handler) { BaseAddress = new Uri("https://api.resend.com/") },
        CreateDb(notifyByEmail),
        Microsoft.Extensions.Options.Options.Create(new ResendOptions
        {
            ApiKey = "re_test",
            FromEmail = "avisos@tanomar.com",
            FromName = "TáNoMar",
            NotificationEmail = "admin@tanomar.com"
        }),
        new AdminNotificationFormatter(),
        NullLogger<ResendEmailNotifier>.Instance);

    private static TaNoMarDbContext CreateDb(bool notifyByEmail = true)
    {
        var options = new DbContextOptionsBuilder<TaNoMarDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new TaNoMarDbContext(options);
        db.WhatsAppSettings.Add(new WhatsAppSettings
        {
            Id = Guid.NewGuid(),
            NotifyByEmail = notifyByEmail
        });
        db.SaveChanges();
        return db;
    }

    private static AdminNotification NewUserNotification() => new(
        AdminNotificationKind.NewUserRegistered,
        "Maria Silva",
        "maria@example.com",
        new DateTimeOffset(2026, 9, 10, 12, 0, 0, TimeSpan.Zero),
        TotalUsers: 42);

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public List<string> Bodies { get; } = [];
        public string? Authorization { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Authorization = request.Headers.Authorization?.ToString();
            Bodies.Add(await request.Content!.ReadAsStringAsync(cancellationToken));
            return new HttpResponseMessage(HttpStatusCode.OK);
        }
    }
}
