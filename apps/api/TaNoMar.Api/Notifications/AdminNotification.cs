namespace TaNoMar.Api.Notifications;

internal enum AdminNotificationKind
{
    NewUserRegistered,
    PlanRequested,
    PlanPaid,
    UserPlanChanged
}

internal sealed record AdminNotification(
    AdminNotificationKind Kind,
    string UserName,
    string UserEmail,
    DateTimeOffset OccurredAt,
    int? TotalUsers = null,
    string? CurrentPlan = null,
    string? RequestedPlan = null,
    string? Cycle = null,
    int? PriceCents = null);

internal sealed record AdminNotificationContent(
    string EmailSubject,
    string EmailText,
    string WhatsAppText);

internal interface IAdminNotificationFormatter
{
    AdminNotificationContent Format(AdminNotification notification);
    string FormatWhatsAppTest(DateTimeOffset occurredAt);
}

internal interface IAdminNotificationChannel
{
    string Name { get; }
    Task SendAsync(AdminNotification notification, CancellationToken cancellationToken);
}

internal interface IAdminNotificationService
{
    void NotifyNewUserRegistered(string name, string email, DateTimeOffset occurredAt, int totalUsers);

    void NotifyPlanRequested(
        string name,
        string email,
        string currentPlan,
        string requestedPlan,
        string cycle,
        int priceCents,
        DateTimeOffset occurredAt);

    void NotifyPlanPaid(
        string name,
        string email,
        string currentPlan,
        string paidPlan,
        string cycle,
        int priceCents,
        DateTimeOffset occurredAt);

    void NotifyUserPlanChanged(
        string name,
        string email,
        string currentPlan,
        string newPlan,
        DateTimeOffset occurredAt);
}
