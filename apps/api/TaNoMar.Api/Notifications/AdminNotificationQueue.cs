using System.Threading.Channels;

namespace TaNoMar.Api.Notifications;

internal sealed class AdminNotificationQueue : IAdminNotificationService
{
    private readonly Channel<AdminNotification> _notifications = Channel.CreateUnbounded<AdminNotification>(new UnboundedChannelOptions
    {
        SingleReader = true,
        SingleWriter = false
    });

    public ChannelReader<AdminNotification> Reader => _notifications.Reader;

    public void NotifyNewUserRegistered(string name, string email, DateTimeOffset occurredAt, int totalUsers) =>
        _notifications.Writer.TryWrite(new AdminNotification(
            AdminNotificationKind.NewUserRegistered,
            name,
            email,
            occurredAt,
            TotalUsers: totalUsers));

    public void NotifyPlanRequested(
        string name,
        string email,
        string currentPlan,
        string requestedPlan,
        string cycle,
        int priceCents,
        DateTimeOffset occurredAt) =>
        _notifications.Writer.TryWrite(new AdminNotification(
            AdminNotificationKind.PlanRequested,
            name,
            email,
            occurredAt,
            CurrentPlan: currentPlan,
            RequestedPlan: requestedPlan,
            Cycle: cycle,
            PriceCents: priceCents));

    public void NotifyPlanPaid(
        string name,
        string email,
        string currentPlan,
        string paidPlan,
        string cycle,
        int priceCents,
        DateTimeOffset occurredAt) =>
        _notifications.Writer.TryWrite(new AdminNotification(
            AdminNotificationKind.PlanPaid,
            name,
            email,
            occurredAt,
            CurrentPlan: currentPlan,
            RequestedPlan: paidPlan,
            Cycle: cycle,
            PriceCents: priceCents));

    public void NotifyUserPlanChanged(
        string name,
        string email,
        string currentPlan,
        string newPlan,
        DateTimeOffset occurredAt) =>
        _notifications.Writer.TryWrite(new AdminNotification(
            AdminNotificationKind.UserPlanChanged,
            name,
            email,
            occurredAt,
            CurrentPlan: currentPlan,
            RequestedPlan: newPlan));

    public void NotifyRenewalCanceled(
        string name,
        string email,
        string plan,
        string cycle,
        DateTimeOffset? accessUntil,
        DateTimeOffset occurredAt) =>
        _notifications.Writer.TryWrite(new AdminNotification(
            AdminNotificationKind.RenewalCanceled,
            name,
            email,
            occurredAt,
            CurrentPlan: plan,
            Cycle: cycle,
            AccessUntil: accessUntil));
}

internal sealed class AdminNotificationWorker(
    AdminNotificationQueue queue,
    IServiceScopeFactory scopes,
    ILogger<AdminNotificationWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var notification in queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = scopes.CreateScope();
                var dispatcher = scope.ServiceProvider.GetRequiredService<AdminNotificationDispatcher>();
                await dispatcher.DispatchAsync(notification, stoppingToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogWarning(exception, "Falha ao processar notificação administrativa {NotificationKind}.", notification.Kind);
            }
        }
    }
}
