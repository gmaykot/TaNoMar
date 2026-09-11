using System.Globalization;

namespace TaNoMar.Api.Notifications;

internal sealed class AdminNotificationFormatter : IAdminNotificationFormatter
{
    private static readonly CultureInfo Portuguese = CultureInfo.GetCultureInfo("pt-BR");
    private static readonly TimeZoneInfo SaoPaulo = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

    public AdminNotificationContent Format(AdminNotification notification) => notification.Kind switch
    {
        AdminNotificationKind.NewUserRegistered => NewUser(notification),
        AdminNotificationKind.PlanRequested => PlanRequested(notification),
        AdminNotificationKind.PlanPaid => PlanPaid(notification),
        AdminNotificationKind.UserPlanChanged => UserPlanChanged(notification),
        AdminNotificationKind.RenewalCanceled => RenewalCanceled(notification),
        _ => throw new ArgumentOutOfRangeException(nameof(notification))
    };

    public string FormatWhatsAppTest(DateTimeOffset occurredAt) =>
        $"🎣 TaNoMar\n\nIntegração com WhatsApp configurada com sucesso.\n\nEnviada em {LocalDate(occurredAt)}.";

    private static AdminNotificationContent NewUser(AdminNotification notification)
    {
        var date = LocalDate(notification.OccurredAt);
        var totalUsers = notification.TotalUsers ?? 0;
        return new AdminNotificationContent(
            "Novo usuário cadastrado no TáNoMar",
            $"Um novo usuário se cadastrou no TáNoMar.\n\nNome: {notification.UserName}\nE-mail: {notification.UserEmail}\nData: {date}\nTotal de usuários: {totalUsers}",
            $"🎣 TaNoMar\n\nNovo usuário cadastrado\n\nNome: {notification.UserName}\nE-mail: {notification.UserEmail}\nData: {date}\n\nTotal de usuários: {totalUsers}");
    }

    private static AdminNotificationContent PlanRequested(AdminNotification notification)
    {
        var date = LocalDate(notification.OccurredAt);
        var cycle = notification.Cycle == "YEARLY" ? "Anual" : "Mensal";
        var price = ((notification.PriceCents ?? 0) / 100m).ToString("C", Portuguese);
        return new AdminNotificationContent(
            "Nova solicitação de plano no TáNoMar",
            $"Um usuário solicitou um plano no TáNoMar.\n\nNome: {notification.UserName}\nE-mail: {notification.UserEmail}\nPlano atual: {notification.CurrentPlan}\nPlano solicitado: {notification.RequestedPlan}\nCiclo: {cycle}\nValor inicial: {price}\nData: {date}",
            $"💳 TaNoMar\n\nNova solicitação de plano\n\nUsuário: {notification.UserName}\nE-mail: {notification.UserEmail}\n\nPlano atual: {notification.CurrentPlan}\nPlano solicitado: {notification.RequestedPlan}\nCiclo: {cycle}\nValor inicial: {price}\n\nData: {date}");
    }

    private static AdminNotificationContent PlanPaid(AdminNotification notification)
    {
        var date = LocalDate(notification.OccurredAt);
        var cycle = notification.Cycle == "YEARLY" ? "Anual" : "Mensal";
        var price = ((notification.PriceCents ?? 0) / 100m).ToString("C", Portuguese);
        return new AdminNotificationContent(
            "Pagamento de plano confirmado no TáNoMar",
            $"O pagamento de um plano foi confirmado no TáNoMar.\n\nNome: {notification.UserName}\nE-mail: {notification.UserEmail}\nPlano anterior: {notification.CurrentPlan}\nPlano pago: {notification.RequestedPlan}\nCiclo: {cycle}\nValor: {price}\nData: {date}",
            $"💳 TaNoMar\n\nPagamento de plano confirmado\n\nUsuário: {notification.UserName}\nE-mail: {notification.UserEmail}\n\nPlano anterior: {notification.CurrentPlan}\nPlano pago: {notification.RequestedPlan}\nCiclo: {cycle}\nValor: {price}\n\nData: {date}");
    }

    private static AdminNotificationContent UserPlanChanged(AdminNotification notification)
    {
        var date = LocalDate(notification.OccurredAt);
        return new AdminNotificationContent(
            "Plano de usuário alterado no TáNoMar",
            $"Um administrador alterou o plano de um usuário no TáNoMar.\n\nNome: {notification.UserName}\nE-mail: {notification.UserEmail}\nPlano anterior: {notification.CurrentPlan}\nNovo plano: {notification.RequestedPlan}\nData: {date}",
            $"💳 TaNoMar\n\nPlano de usuário alterado\n\nUsuário: {notification.UserName}\nE-mail: {notification.UserEmail}\n\nPlano anterior: {notification.CurrentPlan}\nNovo plano: {notification.RequestedPlan}\n\nData: {date}");
    }

    private static AdminNotificationContent RenewalCanceled(AdminNotification notification)
    {
        var date = LocalDate(notification.OccurredAt);
        var cycle = notification.Cycle == "YEARLY" ? "Anual" : "Mensal";
        var accessUntil = notification.AccessUntil is { } until ? LocalDate(until) : "o fim do período";
        return new AdminNotificationContent(
            "Renovação cancelada no TáNoMar",
            $"Um usuário cancelou a renovação no TáNoMar.\n\nNome: {notification.UserName}\nE-mail: {notification.UserEmail}\nPlano: {notification.CurrentPlan}\nCiclo: {cycle}\nAcesso até: {accessUntil}\nData: {date}",
            $"💳 TaNoMar\n\nRenovação cancelada\n\nUsuário: {notification.UserName}\nE-mail: {notification.UserEmail}\n\nPlano: {notification.CurrentPlan}\nCiclo: {cycle}\nAcesso até: {accessUntil}\n\nData: {date}");
    }

    private static string LocalDate(DateTimeOffset value) =>
        TimeZoneInfo.ConvertTime(value, SaoPaulo).ToString("dd/MM/yyyy HH:mm", Portuguese);
}
