using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TaNoMar.Api.Data;

namespace TaNoMar.Api.Notifications;

internal sealed class WhatsAppAdminService(
    TaNoMarDbContext db,
    IWhatsAppGateway gateway,
    IAdminNotificationFormatter formatter,
    IOptions<WhatsAppOptions> options,
    ILogger<WhatsAppAdminService> logger)
{
    public async Task<object> GetAsync(CancellationToken cancellationToken)
    {
        var settings = await db.WhatsAppSettings.AsNoTracking().SingleAsync(cancellationToken);
        var status = await SafeStatusAsync(cancellationToken);
        return Dto(settings, status);
    }

    public async Task<IResult> UpdateAsync(WhatsAppSettingsRequest request, CancellationToken cancellationToken)
    {
        var instanceName = request.InstanceName?.Trim();
        if (string.IsNullOrWhiteSpace(instanceName) || instanceName.Length > 80)
            return Results.BadRequest(new { code = "invalid_instance", detail = "Informe um nome de instância com até 80 caracteres." });

        if (!WhatsAppDestinationRules.TryNormalize(
                request.DefaultDestinationType,
                request.DefaultDestinationId,
                request.DefaultDestinationName,
                out var destinationType,
                out var destinationId,
                out var destinationName,
                out var destinationError))
            return Results.BadRequest(new { code = "invalid_destination", detail = destinationError });

        var settings = await db.WhatsAppSettings.SingleAsync(cancellationToken);
        if (!request.Enabled && !request.NotifyByEmail)
            return Results.BadRequest(new { code = "notification_channel_required", detail = "Selecione e-mail, WhatsApp ou os dois." });
        settings.Enabled = request.Enabled;
        settings.NotifyByEmail = request.NotifyByEmail;
        settings.InstanceName = instanceName;
        settings.DefaultDestinationType = destinationType;
        settings.DefaultDestinationId = destinationId;
        settings.DefaultDestinationName = destinationName;
        settings.NotifyNewUser = request.NotifyNewUser;
        settings.NotifyPlanRequested = request.NotifyPlanRequested;
        settings.NotifyPlanPaid = request.NotifyPlanPaid;
        settings.NotifyPlanChanged = request.NotifyPlanChanged;
        settings.NotifyRenewalCanceled = request.NotifyRenewalCanceled;
        settings.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(Dto(settings, await SafeStatusAsync(cancellationToken)));
    }

    public async Task<IResult> GetDestinationsAsync(CancellationToken cancellationToken)
    {
        try
        {
            var personal = await gateway.GetPersonalChatsAsync(cancellationToken);
            var groups = await gateway.GetGroupsAsync(cancellationToken);
            return Results.Ok(new { personal, groups });
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            return GatewayError(exception, "listar os destinos");
        }
    }

    public async Task<IResult> GetQrAsync(CancellationToken cancellationToken)
    {
        try
        {
            var dataUrl = await gateway.GetQrCodeAsync(cancellationToken);
            return dataUrl is null
                ? Results.Conflict(new { code = "qr_unavailable", detail = "O QR Code ainda não está disponível. Tente novamente em instantes." })
                : Results.Ok(new { dataUrl });
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            return GatewayError(exception, "obter o QR Code");
        }
    }

    public Task<IResult> ConnectAsync(CancellationToken cancellationToken) => ChangeConnectionAsync(
        async (settings, token) => await gateway.ConnectAsync(settings.InstanceName, token),
        "conectar",
        cancellationToken);

    public Task<IResult> ReconnectAsync(CancellationToken cancellationToken) => ChangeConnectionAsync(
        async (settings, token) => await gateway.ReconnectAsync(settings.InstanceName, token),
        "reconectar",
        cancellationToken);

    public async Task<IResult> DisconnectAsync(CancellationToken cancellationToken)
    {
        try
        {
            await gateway.LogoutAsync(cancellationToken);
            return Results.Ok(new { detail = "WhatsApp desconectado." });
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            return GatewayError(exception, "desconectar");
        }
    }

    public async Task<IResult> SendTestAsync(CancellationToken cancellationToken)
    {
        var settings = await db.WhatsAppSettings.AsNoTracking().SingleAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(settings.DefaultDestinationId))
            return Results.BadRequest(new { code = "destination_required", detail = "Selecione o destino das notificações." });
        var destinationId = string.Equals(settings.DefaultDestinationType, "Personal", StringComparison.OrdinalIgnoreCase)
            ? WhatsAppDestinationRules.NormalizePersonalId(settings.DefaultDestinationId) ?? settings.DefaultDestinationId
            : settings.DefaultDestinationId;
        try
        {
            await gateway.SendAsync(destinationId, formatter.FormatWhatsAppTest(DateTimeOffset.UtcNow), cancellationToken);
            var connected = (await SafeStatusAsync(cancellationToken)).PhoneNumber;
            return Results.Ok(new
            {
                detail = connected is null
                    ? "Mensagem de teste enviada. No celular de destino, abra a conversa com o número conectado do TáNoMar."
                    : $"Mensagem de teste enviada. No celular de destino, abra a conversa com {connected}."
            });
        }
        catch (WhatsAppGatewayException exception) when (exception.StatusCode is >= 400 and < 500)
        {
            return Results.BadRequest(new { code = "invalid_destination", detail = exception.Message });
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            return GatewayError(exception, "enviar a mensagem de teste");
        }
    }

    private async Task<IResult> ChangeConnectionAsync(
        Func<WhatsAppSettings, CancellationToken, Task> action,
        string operation,
        CancellationToken cancellationToken)
    {
        var settings = await db.WhatsAppSettings.AsNoTracking().SingleAsync(cancellationToken);
        try
        {
            await action(settings, cancellationToken);
            return Results.Ok(new { detail = "Conexão com o WhatsApp iniciada." });
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            return GatewayError(exception, operation);
        }
    }

    private async Task<WhatsAppGatewayStatus> SafeStatusAsync(CancellationToken cancellationToken)
    {
        if (!options.Value.IsConfigured)
            return new WhatsAppGatewayStatus("error", null, null, "Integração desabilitada ou incompleta no ambiente.");
        try
        {
            return await gateway.GetStatusAsync(cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "WhatsApp disconnected: falha ao consultar o serviço.");
            return new WhatsAppGatewayStatus("error", null, null, "Não foi possível consultar o serviço WhatsApp.");
        }
    }

    private IResult GatewayError(Exception exception, string operation)
    {
        logger.LogWarning(exception, "WhatsApp notification failed ao {Operation}.", operation);
        return Results.Json(new
        {
            code = "whatsapp_unavailable",
            detail = $"Não foi possível {operation} no WhatsApp. Verifique a conexão e tente novamente."
        }, statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    private static object Dto(WhatsAppSettings settings, WhatsAppGatewayStatus status) => new
    {
        enabled = settings.Enabled,
        notifyByEmail = settings.NotifyByEmail,
        instanceName = settings.InstanceName,
        defaultDestinationType = settings.DefaultDestinationType?.ToLowerInvariant(),
        defaultDestinationId = settings.DefaultDestinationId,
        defaultDestinationName = settings.DefaultDestinationName,
        notifyNewUser = settings.NotifyNewUser,
        notifyPlanRequested = settings.NotifyPlanRequested,
        notifyPlanPaid = settings.NotifyPlanPaid,
        notifyPlanChanged = settings.NotifyPlanChanged,
        notifyRenewalCanceled = settings.NotifyRenewalCanceled,
        createdAt = settings.CreatedAt,
        updatedAt = settings.UpdatedAt,
        status = new
        {
            state = NormalizeStatus(status.State),
            phoneNumber = status.PhoneNumber,
            lastConnectedAt = status.LastConnectedAt,
            error = status.Error
        }
    };

    private static string NormalizeStatus(string? value) => value?.ToLowerInvariant() switch
    {
        "connected" => "connected",
        "connecting" => "connecting",
        "error" => "error",
        _ => "disconnected"
    };
}

internal sealed record WhatsAppSettingsRequest(
    bool Enabled,
    bool NotifyByEmail,
    string? InstanceName,
    string? DefaultDestinationType,
    string? DefaultDestinationId,
    string? DefaultDestinationName,
    bool NotifyNewUser,
    bool NotifyPlanRequested,
    bool NotifyPlanPaid,
    bool NotifyPlanChanged,
    bool NotifyRenewalCanceled);
