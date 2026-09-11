using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TaNoMar.Api.Data;

namespace TaNoMar.Api.Notifications;

internal sealed class ResendOptions
{
    public const string SectionName = "Resend";

    public string ApiKey { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = "TáNoMar";
    public string NotificationEmail { get; set; } = string.Empty;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey)
        && !string.IsNullOrWhiteSpace(FromEmail)
        && !string.IsNullOrWhiteSpace(NotificationEmail);
}

internal sealed class ResendEmailNotifier(
    HttpClient client,
    TaNoMarDbContext db,
    IOptions<ResendOptions> options,
    IAdminNotificationFormatter formatter,
    ILogger<ResendEmailNotifier> logger)
    : IAdminNotificationChannel
{
    public string Name => "Email";

    public async Task SendAsync(AdminNotification notification, CancellationToken cancellationToken)
    {
        var configuration = options.Value;
        if (!configuration.IsConfigured) return;
        var settings = await db.WhatsAppSettings.AsNoTracking().SingleOrDefaultAsync(cancellationToken);
        if (settings is null
            || !settings.NotifyByEmail
            || notification.Kind == AdminNotificationKind.NewUserRegistered && !settings.NotifyNewUser
            || notification.Kind == AdminNotificationKind.PlanRequested && !settings.NotifyPlanRequested
            || notification.Kind == AdminNotificationKind.PlanPaid && !settings.NotifyPlanPaid
            || notification.Kind == AdminNotificationKind.UserPlanChanged && !settings.NotifyPlanChanged
            || notification.Kind == AdminNotificationKind.RenewalCanceled && !settings.NotifyRenewalCanceled)
            return;

        var content = formatter.Format(notification);

        using var request = new HttpRequestMessage(HttpMethod.Post, "emails");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", configuration.ApiKey);
        request.Content = JsonContent.Create(new
        {
            from = string.IsNullOrWhiteSpace(configuration.FromName)
                ? configuration.FromEmail
                : $"{configuration.FromName.Trim()} <{configuration.FromEmail.Trim()}>",
            to = new[] { configuration.NotificationEmail.Trim() },
            subject = content.EmailSubject,
            text = content.EmailText
        });
        using var response = await client.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
            logger.LogWarning("Resend recusou o e-mail de notificação com status {StatusCode}.", (int)response.StatusCode);
    }
}
