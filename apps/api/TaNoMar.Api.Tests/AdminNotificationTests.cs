using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using TaNoMar.Api.Data;
using TaNoMar.Api.Notifications;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class AdminNotificationTests
{
    [Fact]
    public void Formatter_includes_required_new_user_data()
    {
        var content = new AdminNotificationFormatter().Format(NewUser());

        Assert.Contains("Novo usuário cadastrado", content.WhatsAppText);
        Assert.Contains("Maria Silva", content.WhatsAppText);
        Assert.Contains("maria@example.com", content.WhatsAppText);
        Assert.Contains("Total de usuários: 42", content.WhatsAppText);
    }

    [Fact]
    public void Formatter_includes_previous_and_new_plan_when_admin_changes_user_plan()
    {
        var content = new AdminNotificationFormatter().Format(new AdminNotification(
            AdminNotificationKind.UserPlanChanged,
            "Maria Silva",
            "maria@example.com",
            new DateTimeOffset(2026, 9, 10, 12, 0, 0, TimeSpan.Zero),
            CurrentPlan: "Free",
            RequestedPlan: "Mestre"));

        Assert.Contains("Plano de usuário alterado", content.WhatsAppText);
        Assert.Contains("Plano anterior: Free", content.WhatsAppText);
        Assert.Contains("Novo plano: Mestre", content.WhatsAppText);
    }

    [Fact]
    public void Formatter_includes_renewal_canceled_details()
    {
        var content = new AdminNotificationFormatter().Format(new AdminNotification(
            AdminNotificationKind.RenewalCanceled,
            "Maria Silva",
            "maria@example.com",
            new DateTimeOffset(2026, 9, 10, 12, 0, 0, TimeSpan.Zero),
            CurrentPlan: "Mestre",
            Cycle: "YEARLY",
            AccessUntil: new DateTimeOffset(2026, 10, 10, 12, 0, 0, TimeSpan.Zero)));

        Assert.Contains("Renovação cancelada", content.WhatsAppText);
        Assert.Contains("Plano: Mestre", content.WhatsAppText);
        Assert.Contains("Ciclo: Anual", content.WhatsAppText);
        Assert.Contains("Acesso até: 10/10/2026", content.WhatsAppText);
        Assert.Equal("Renovação cancelada no TáNoMar", content.EmailSubject);
    }

    [Fact]
    public void Formatter_includes_payment_confirmation_details()
    {
        var content = new AdminNotificationFormatter().Format(new AdminNotification(
            AdminNotificationKind.PlanPaid,
            "Maria Silva",
            "maria@example.com",
            new DateTimeOffset(2026, 9, 10, 12, 0, 0, TimeSpan.Zero),
            CurrentPlan: "Free",
            RequestedPlan: "Mestre",
            Cycle: "YEARLY",
            PriceCents: 19104));

        Assert.Contains("Pagamento de plano confirmado", content.WhatsAppText);
        Assert.Contains("Plano anterior: Free", content.WhatsAppText);
        Assert.Contains("Plano pago: Mestre", content.WhatsAppText);
        Assert.Contains("Ciclo: Anual", content.WhatsAppText);
        Assert.Contains("R$ 191,04", content.WhatsAppText);
        Assert.Equal("Pagamento de plano confirmado no TáNoMar", content.EmailSubject);
    }

    [Fact]
    public async Task Dispatcher_attempts_next_channel_when_first_one_fails()
    {
        var failing = new RecordingChannel("Email", shouldFail: true);
        var successful = new RecordingChannel("WhatsApp");
        var dispatcher = new AdminNotificationDispatcher(
            [failing, successful],
            NullLogger<AdminNotificationDispatcher>.Instance);

        await dispatcher.DispatchAsync(NewUser(), CancellationToken.None);

        Assert.Equal(1, failing.Attempts);
        Assert.Equal(1, successful.Attempts);
    }

    [Fact]
    public async Task Dispatcher_attempts_next_channel_when_first_one_times_out()
    {
        var timingOut = new RecordingChannel("Email", exception: new TaskCanceledException("timeout"));
        var successful = new RecordingChannel("WhatsApp");
        var dispatcher = new AdminNotificationDispatcher(
            [timingOut, successful],
            NullLogger<AdminNotificationDispatcher>.Instance);

        await dispatcher.DispatchAsync(NewUser(), CancellationToken.None);

        Assert.Equal(1, timingOut.Attempts);
        Assert.Equal(1, successful.Attempts);
    }

    [Fact]
    public async Task WhatsApp_channel_respects_database_settings_and_event_flag()
    {
        await using var db = CreateDb();
        db.WhatsAppSettings.Add(new WhatsAppSettings
        {
            Id = Guid.NewGuid(),
            Enabled = true,
            InstanceName = "TaNoMar",
            DefaultDestinationType = "Group",
            DefaultDestinationId = "120363000000@g.us",
            DefaultDestinationName = "TaNoMar Admin",
            NotifyNewUser = true,
            NotifyPlanRequested = false,
            NotifyPlanPaid = false,
            NotifyPlanChanged = true,
            NotifyRenewalCanceled = true
        });
        await db.SaveChangesAsync();
        var gateway = new RecordingGateway();
        var channel = new WhatsAppNotificationChannel(
            db,
            gateway,
            new AdminNotificationFormatter(),
            Microsoft.Extensions.Options.Options.Create(new WhatsAppOptions
            {
                Enabled = true,
                BaseUrl = "http://whatsapp:3000",
                ApiKey = "secret"
            }),
            NullLogger<WhatsAppNotificationChannel>.Instance);

        await channel.SendAsync(NewUser(), CancellationToken.None);
        await channel.SendAsync(new AdminNotification(
            AdminNotificationKind.PlanRequested,
            "Maria Silva",
            "maria@example.com",
            DateTimeOffset.UtcNow,
            CurrentPlan: "Free",
            RequestedPlan: "Mestre",
            Cycle: "MONTHLY",
            PriceCents: 1990), CancellationToken.None);
        await channel.SendAsync(new AdminNotification(
            AdminNotificationKind.PlanPaid,
            "Maria Silva",
            "maria@example.com",
            DateTimeOffset.UtcNow,
            CurrentPlan: "Free",
            RequestedPlan: "Mestre",
            Cycle: "YEARLY",
            PriceCents: 19104), CancellationToken.None);
        db.WhatsAppSettings.Single().NotifyPlanChanged = false;
        db.WhatsAppSettings.Single().NotifyRenewalCanceled = false;
        await db.SaveChangesAsync();
        await channel.SendAsync(new AdminNotification(
            AdminNotificationKind.UserPlanChanged,
            "Maria Silva",
            "maria@example.com",
            DateTimeOffset.UtcNow,
            CurrentPlan: "Free",
            RequestedPlan: "Mestre"), CancellationToken.None);
        await channel.SendAsync(new AdminNotification(
            AdminNotificationKind.RenewalCanceled,
            "Maria Silva",
            "maria@example.com",
            DateTimeOffset.UtcNow,
            CurrentPlan: "Mestre",
            Cycle: "MONTHLY",
            AccessUntil: DateTimeOffset.UtcNow.AddMonths(1)), CancellationToken.None);

        var sent = Assert.Single(gateway.Sent);
        Assert.Equal("120363000000@g.us", sent.DestinationId);
        Assert.Contains("Novo usuário cadastrado", sent.Message);
    }

    private static AdminNotification NewUser() => new(
        AdminNotificationKind.NewUserRegistered,
        "Maria Silva",
        "maria@example.com",
        new DateTimeOffset(2026, 9, 10, 12, 0, 0, TimeSpan.Zero),
        TotalUsers: 42);

    private static TaNoMarDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<TaNoMarDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new TaNoMarDbContext(options);
    }

    private sealed class RecordingChannel(
        string name,
        bool shouldFail = false,
        Exception? exception = null) : IAdminNotificationChannel
    {
        public string Name => name;
        public int Attempts { get; private set; }

        public Task SendAsync(AdminNotification notification, CancellationToken cancellationToken)
        {
            Attempts++;
            return exception is not null
                ? Task.FromException(exception)
                : shouldFail
                    ? Task.FromException(new InvalidOperationException("channel failed"))
                    : Task.CompletedTask;
        }
    }

    private sealed class RecordingGateway : IWhatsAppGateway
    {
        public List<(string DestinationId, string Message)> Sent { get; } = [];

        public Task<WhatsAppGatewayStatus> GetStatusAsync(CancellationToken cancellationToken) =>
            Task.FromResult(new WhatsAppGatewayStatus("connected", "5511999999999", DateTimeOffset.UtcNow, null));
        public Task<string?> GetQrCodeAsync(CancellationToken cancellationToken) => Task.FromResult<string?>(null);
        public Task<IReadOnlyList<WhatsAppDestination>> GetPersonalChatsAsync(CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<WhatsAppDestination>>([]);
        public Task<IReadOnlyList<WhatsAppDestination>> GetGroupsAsync(CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<WhatsAppDestination>>([]);
        public Task ConnectAsync(string instanceName, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task ReconnectAsync(string instanceName, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task LogoutAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task SendAsync(string destinationId, string message, CancellationToken cancellationToken)
        {
            Sent.Add((destinationId, message));
            return Task.CompletedTask;
        }
    }
}
