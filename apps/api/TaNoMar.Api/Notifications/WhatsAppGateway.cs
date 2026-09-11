using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace TaNoMar.Api.Notifications;

internal sealed class WhatsAppOptions
{
    public const string SectionName = "WhatsApp";

    public bool Enabled { get; set; }
    public string BaseUrl { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;

    public bool IsConfigured => Enabled
        && Uri.TryCreate(BaseUrl, UriKind.Absolute, out _)
        && !string.IsNullOrWhiteSpace(ApiKey);
}

internal sealed record WhatsAppGatewayStatus(
    string State,
    string? PhoneNumber,
    DateTimeOffset? LastConnectedAt,
    string? Error);

internal sealed record WhatsAppDestination(string Id, string Name);

internal sealed class WhatsAppGatewayException(int statusCode, string detail) : InvalidOperationException(detail)
{
    public int StatusCode { get; } = statusCode;
}

internal interface IWhatsAppGateway
{
    Task<WhatsAppGatewayStatus> GetStatusAsync(CancellationToken cancellationToken);
    Task<string?> GetQrCodeAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<WhatsAppDestination>> GetPersonalChatsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<WhatsAppDestination>> GetGroupsAsync(CancellationToken cancellationToken);
    Task ConnectAsync(string instanceName, CancellationToken cancellationToken);
    Task ReconnectAsync(string instanceName, CancellationToken cancellationToken);
    Task LogoutAsync(CancellationToken cancellationToken);
    Task SendAsync(string destinationId, string message, CancellationToken cancellationToken);
}

internal sealed class BaileysWhatsAppGateway(HttpClient client, IOptions<WhatsAppOptions> options) : IWhatsAppGateway
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public Task<WhatsAppGatewayStatus> GetStatusAsync(CancellationToken cancellationToken) =>
        GetAsync<WhatsAppGatewayStatus>("status", cancellationToken);

    public async Task<string?> GetQrCodeAsync(CancellationToken cancellationToken)
    {
        var response = await GetAsync<QrResponse>("qr", cancellationToken);
        return response.DataUrl;
    }

    public async Task<IReadOnlyList<WhatsAppDestination>> GetPersonalChatsAsync(CancellationToken cancellationToken) =>
        (await GetAsync<DestinationResponse>("chats", cancellationToken)).Items;

    public async Task<IReadOnlyList<WhatsAppDestination>> GetGroupsAsync(CancellationToken cancellationToken) =>
        (await GetAsync<DestinationResponse>("groups", cancellationToken)).Items;

    public Task ConnectAsync(string instanceName, CancellationToken cancellationToken) =>
        PostAsync("connect", new { instanceName }, cancellationToken);

    public Task ReconnectAsync(string instanceName, CancellationToken cancellationToken) =>
        PostAsync("reconnect", new { instanceName }, cancellationToken);

    public Task LogoutAsync(CancellationToken cancellationToken) =>
        PostAsync("logout", new { }, cancellationToken);

    public Task SendAsync(string destinationId, string message, CancellationToken cancellationToken) =>
        PostAsync("send", new { destinationId, message }, cancellationToken);

    private async Task<T> GetAsync<T>(string path, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        using var request = CreateRequest(HttpMethod.Get, path);
        using var response = await client.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
        return await response.Content.ReadFromJsonAsync<T>(Json, cancellationToken)
            ?? throw new InvalidOperationException("O serviço WhatsApp retornou uma resposta vazia.");
    }

    private async Task PostAsync<T>(string path, T body, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        using var request = CreateRequest(HttpMethod.Post, path);
        request.Content = JsonContent.Create(body, options: Json);
        using var response = await client.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string path)
    {
        var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.Value.ApiKey.Trim());
        return request;
    }

    private void EnsureConfigured()
    {
        if (!options.Value.IsConfigured)
            throw new InvalidOperationException("A integração com WhatsApp não está configurada no ambiente.");
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode) return;
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var detail = TryReadDetail(body)
            ?? (string.IsNullOrWhiteSpace(body)
                ? $"O serviço WhatsApp respondeu com status {(int)response.StatusCode}."
                : body);
        throw new WhatsAppGatewayException((int)response.StatusCode, detail);
    }

    private static string? TryReadDetail(string body)
    {
        try
        {
            using var document = JsonDocument.Parse(body);
            return document.RootElement.TryGetProperty("detail", out var detail)
                ? detail.GetString()
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private sealed record QrResponse(string? DataUrl);
    private sealed record DestinationResponse(List<WhatsAppDestination> Items);
}
