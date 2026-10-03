using System.Net.Http.Json;
using System.Text.Json.Serialization;
using TaNoMar.Monitor.Configuration;
using TaNoMar.Monitor.Monitoring;

namespace TaNoMar.Monitor.Notifications;

public sealed class WhatsAppAlertSender(HttpClient statusClient, HttpClient sendClient, WhatsAppOptions options, ILogger<WhatsAppAlertSender> logger) : IAlertSender
{
    public Task<AlertDeliveryResult> SendDownAsync(MonitorCheckState state, string url, CancellationToken cancellationToken) =>
        SendAsync($"🔴 TaNoMar - Serviço indisponível\n\nServiço: {state.Name}\nFalha detectada: {Format(state.LastFailureAt)}\nConfirmações: {state.ConsecutiveFailures}\nErro: {state.LastError}\nURL: {url}", cancellationToken);

    public Task<AlertDeliveryResult> SendRecoveryAsync(MonitorCheckState state, CancellationToken cancellationToken)
    {
        var duration = state.OutageStartedAt is null ? "desconhecida" : FormatDuration(DateTimeOffset.UtcNow - state.OutageStartedAt.Value);
        return SendAsync($"🟢 TaNoMar - Serviço recuperado\n\nServiço: {state.Name}\nRecuperado: {Format(state.LastSuccessAt)}\nIndisponibilidade: {duration}", cancellationToken);
    }

    private async Task<AlertDeliveryResult> SendAsync(string message, CancellationToken cancellationToken)
    {
        try
        {
            using var statusRequest = new HttpRequestMessage(HttpMethod.Get, "/status");
            statusRequest.Headers.Authorization = new("Bearer", options.ApiKey);
            using var statusResponse = await statusClient.SendAsync(statusRequest, cancellationToken);
            if (!statusResponse.IsSuccessStatusCode)
            {
                logger.LogWarning("WhatsApp status falhou com HTTP {StatusCode}; alerta não enviado", (int)statusResponse.StatusCode);
                return ClassifyHttpFailure(statusResponse.StatusCode);
            }
            if (statusResponse.Content.Headers.ContentLength > 16 * 1024)
            {
                logger.LogWarning("Resposta de status do WhatsApp excede o limite");
                return AlertDeliveryResult.TransientFailure();
            }
            var status = await statusResponse.Content.ReadFromJsonAsync<WhatsAppStatus>(cancellationToken);
            if (!string.Equals(status?.State, "connected", StringComparison.OrdinalIgnoreCase))
            {
                logger.LogWarning("WhatsApp não está conectado; alerta não enviado");
                return AlertDeliveryResult.TransientFailure();
            }
            using var sendRequest = new HttpRequestMessage(HttpMethod.Post, "/send") { Content = JsonContent.Create(new { destinationId = options.DestinationId, message }) };
            sendRequest.Headers.Authorization = new("Bearer", options.ApiKey);
            using var sendResponse = await sendClient.SendAsync(sendRequest, cancellationToken);
            if (!sendResponse.IsSuccessStatusCode)
            {
                logger.LogWarning("Envio WhatsApp falhou com HTTP {StatusCode}", (int)sendResponse.StatusCode);
                return ClassifyHttpFailure(sendResponse.StatusCode);
            }
            logger.LogInformation("Alerta enviado pelo WhatsApp");
            return AlertDeliveryResult.Success();
        }
        catch (System.Text.Json.JsonException exception)
        {
            logger.LogWarning("Resposta inválida do status do WhatsApp: {Message}", exception.Message);
            return AlertDeliveryResult.TransientFailure();
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning("Timeout ao enviar alerta pelo WhatsApp");
            return AlertDeliveryResult.TransientFailure();
        }
        catch (HttpRequestException exception)
        {
            logger.LogWarning("Falha ao enviar alerta pelo WhatsApp: {Message}", exception.Message);
            return AlertDeliveryResult.TransientFailure();
        }
    }

    private static string Format(DateTimeOffset? value) => value?.ToString("yyyy-MM-dd HH:mm:ss 'UTC'") ?? "desconhecida";
    private static string FormatDuration(TimeSpan value) => value.TotalHours >= 1 ? $"{(int)value.TotalHours}h {value.Minutes}min" : $"{value.Minutes}min {value.Seconds}s";
    private static AlertDeliveryResult ClassifyHttpFailure(System.Net.HttpStatusCode statusCode)
        => (int)statusCode >= 500 ? AlertDeliveryResult.TransientFailure() : AlertDeliveryResult.PermanentFailure();
    private sealed record WhatsAppStatus([property: JsonPropertyName("state")] string? State);
}
