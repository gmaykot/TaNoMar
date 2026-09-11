using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TaNoMar.Api.Data;

namespace TaNoMar.Api.Notifications;

internal sealed class WhatsAppNotificationChannel(
    TaNoMarDbContext db,
    IWhatsAppGateway gateway,
    IAdminNotificationFormatter formatter,
    IOptions<WhatsAppOptions> options,
    ILogger<WhatsAppNotificationChannel> logger) : IAdminNotificationChannel
{
    private static readonly TimeSpan[] RetryDelays =
    [
        TimeSpan.FromSeconds(15),
        TimeSpan.FromSeconds(30),
        TimeSpan.FromSeconds(60),
        TimeSpan.FromSeconds(120)
    ];

    public string Name => "WhatsApp";

    public async Task SendAsync(AdminNotification notification, CancellationToken cancellationToken)
    {
        if (!options.Value.IsConfigured) return;

        var settings = await db.WhatsAppSettings.AsNoTracking().SingleOrDefaultAsync(cancellationToken);
        if (settings is null
            || !settings.Enabled
            || string.IsNullOrWhiteSpace(settings.DefaultDestinationId)
            || notification.Kind == AdminNotificationKind.NewUserRegistered && !settings.NotifyNewUser
            || notification.Kind == AdminNotificationKind.PlanRequested && !settings.NotifyPlanRequested
            || notification.Kind == AdminNotificationKind.PlanPaid && !settings.NotifyPlanPaid
            || notification.Kind == AdminNotificationKind.UserPlanChanged && !settings.NotifyPlanChanged
            || notification.Kind == AdminNotificationKind.RenewalCanceled && !settings.NotifyRenewalCanceled)
            return;

        var message = formatter.Format(notification).WhatsAppText;
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                await gateway.SendAsync(settings.DefaultDestinationId, message, cancellationToken);
                logger.LogInformation("WhatsApp notification sent for {NotificationKind}.", notification.Kind);
                return;
            }
            catch (Exception exception) when (exception is not OperationCanceledException && attempt < RetryDelays.Length)
            {
                logger.LogWarning(
                    exception,
                    "WhatsApp notification failed for {NotificationKind}; retry {RetryAttempt} scheduled.",
                    notification.Kind,
                    attempt + 1);
                await Task.Delay(RetryDelays[attempt], cancellationToken);
            }
        }
    }
}
