namespace TaNoMar.Api.Notifications;

internal sealed class AdminNotificationDispatcher(
    IEnumerable<IAdminNotificationChannel> channels,
    ILogger<AdminNotificationDispatcher> logger)
{
    public async Task DispatchAsync(AdminNotification notification, CancellationToken cancellationToken)
    {
        foreach (var channel in channels)
        {
            try
            {
                await channel.SendAsync(notification, cancellationToken);
            }
            catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
            {
                logger.LogWarning(exception, "Falha ao enviar notificação administrativa pelo canal {Channel}.", channel.Name);
            }
        }
    }
}
