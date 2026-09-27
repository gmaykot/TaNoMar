using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace TaNoMar.Api.Billing;

internal interface IAsaasClient
{
    Task<AsaasCheckoutCreated> CreateCheckoutAsync(AsaasCheckoutRequest request, CancellationToken cancellationToken);
    Task UpdateSubscriptionValueAsync(string subscriptionId, decimal value, bool updatePendingPayments, CancellationToken cancellationToken);
    Task<AsaasCancellationOutcome> CancelSubscriptionAsync(string subscriptionId, CancellationToken cancellationToken);
    Task<AsaasConfirmedCheckout?> FindConfirmedCheckoutAsync(string checkoutId, CancellationToken cancellationToken);
}

internal sealed class AsaasClient(HttpClient http, IOptions<BillingOptions> options, ILogger<AsaasClient> logger) : IAsaasClient
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public async Task<AsaasCheckoutCreated> CreateCheckoutAsync(AsaasCheckoutRequest request, CancellationToken cancellationToken)
    {
        using var message = new HttpRequestMessage(HttpMethod.Post, "checkouts")
        {
            Content = JsonContent.Create(request, options: Json)
        };
        ApplyAuth(message);
        using var response = await http.SendAsync(message, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Asaas checkout falhou ({Status}): {Body}", (int)response.StatusCode, body);
            throw new InvalidOperationException("Não foi possível criar o checkout no Asaas.");
        }
        var created = JsonSerializer.Deserialize<AsaasCheckoutCreated>(body, Json)
            ?? throw new InvalidOperationException("Resposta de checkout inválida.");
        if (string.IsNullOrWhiteSpace(created.Id))
            throw new InvalidOperationException("O Asaas não devolveu o identificador do checkout.");
        created.Link = string.IsNullOrWhiteSpace(created.Link) ? CheckoutLink(created.Id) : created.Link;
        return created;
    }

    public async Task UpdateSubscriptionValueAsync(string subscriptionId, decimal value, bool updatePendingPayments, CancellationToken cancellationToken)
    {
        using var message = new HttpRequestMessage(HttpMethod.Put, $"subscriptions/{Uri.EscapeDataString(subscriptionId)}")
        {
            Content = JsonContent.Create(new { value, updatePendingPayments }, options: Json)
        };
        ApplyAuth(message);
        using var response = await http.SendAsync(message, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogWarning("Asaas PUT assinatura falhou ({Status}): {Body}", (int)response.StatusCode, body);
        }
    }

    public async Task<AsaasCancellationOutcome> CancelSubscriptionAsync(string subscriptionId, CancellationToken cancellationToken)
    {
        try
        {
            using var message = new HttpRequestMessage(HttpMethod.Delete, $"subscriptions/{Uri.EscapeDataString(subscriptionId)}");
            ApplyAuth(message);
            using var response = await http.SendAsync(message, cancellationToken);
            if (response.IsSuccessStatusCode)
                return AsaasCancellationOutcome.Confirmed;

            logger.LogWarning("Asaas DELETE assinatura falhou ({Status}).", (int)response.StatusCode);
            if (await IsDeletedAsync(subscriptionId, cancellationToken))
                return AsaasCancellationOutcome.Confirmed;

            return response.StatusCode is System.Net.HttpStatusCode.BadRequest
                or System.Net.HttpStatusCode.Unauthorized
                or System.Net.HttpStatusCode.Forbidden
                or System.Net.HttpStatusCode.NotFound
                ? AsaasCancellationOutcome.ActionRequired
                : AsaasCancellationOutcome.Pending;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning("Timeout ao remover assinatura no Asaas; conciliando estado remoto.");
            return await ReconcileAfterAmbiguousResponseAsync(subscriptionId, cancellationToken);
        }
        catch (HttpRequestException exception)
        {
            logger.LogWarning(exception, "Resposta ambígua ao remover assinatura no Asaas; conciliando estado remoto.");
            return await ReconcileAfterAmbiguousResponseAsync(subscriptionId, cancellationToken);
        }
    }

    private async Task<AsaasCancellationOutcome> ReconcileAfterAmbiguousResponseAsync(string subscriptionId, CancellationToken cancellationToken)
    {
        try
        {
            return await IsDeletedAsync(subscriptionId, cancellationToken)
                ? AsaasCancellationOutcome.Confirmed
                : AsaasCancellationOutcome.Pending;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return AsaasCancellationOutcome.Pending;
        }
        catch (HttpRequestException)
        {
            return AsaasCancellationOutcome.Pending;
        }
    }

    private async Task<bool> IsDeletedAsync(string subscriptionId, CancellationToken cancellationToken)
    {
        const int pageSize = 100;
        var offset = 0;
        while (true)
        {
            var path = $"subscriptions?deletedOnly=true&limit={pageSize}&offset={offset}";
            using var message = new HttpRequestMessage(HttpMethod.Get, path);
            ApplyAuth(message);
            using var response = await http.SendAsync(message, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return false;
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            var page = JsonSerializer.Deserialize<AsaasListResponse<AsaasListedSubscription>>(body, Json);
            if (page?.Data.Exists(item => string.Equals(item.Id, subscriptionId, StringComparison.Ordinal)) == true)
                return true;
            if (page is null || !page.HasMore || page.Data.Count == 0)
                return false;
            offset += pageSize;
        }
    }

    public async Task<AsaasConfirmedCheckout?> FindConfirmedCheckoutAsync(string checkoutId, CancellationToken cancellationToken)
    {
        var payments = await ListAsync<AsaasListedPayment>("payments?limit=50", cancellationToken);
        var paid = payments.Find(item =>
            string.Equals(item.CheckoutSession, checkoutId, StringComparison.OrdinalIgnoreCase)
            && BillingPricing.IsConfirmedPaymentStatus(item.Status));
        if (paid is not null)
            return new AsaasConfirmedCheckout(paid.Subscription, paid.Customer);
        return null;
    }

    private async Task<List<T>> ListAsync<T>(string path, CancellationToken cancellationToken)
    {
        using var message = new HttpRequestMessage(HttpMethod.Get, path);
        ApplyAuth(message);
        using var response = await http.SendAsync(message, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Asaas GET {Path} falhou ({Status}): {Body}", path, (int)response.StatusCode, body);
            return [];
        }
        var list = JsonSerializer.Deserialize<AsaasListResponse<T>>(body, Json);
        return list?.Data ?? [];
    }

    private void ApplyAuth(HttpRequestMessage message)
    {
        var key = options.Value.AsaasApiKey;
        message.Headers.TryAddWithoutValidation("access_token", key);
        message.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    private string CheckoutLink(string id)
    {
        if (options.Value.IsSandbox)
            return $"https://sandbox.asaas.com/checkoutSession/show/{id}";
        return $"https://asaas.com/checkoutSession/show?id={Uri.EscapeDataString(id)}";
    }
}

internal sealed class AsaasCheckoutRequest
{
    public string[] BillingTypes { get; set; } = ["CREDIT_CARD"];
    public string[] ChargeTypes { get; set; } = ["RECURRENT"];
    public int MinutesToExpire { get; set; } = BillingOptions.CheckoutMinutesToExpire;
    public string ExternalReference { get; set; } = string.Empty;
    public AsaasCallback Callback { get; set; } = new();
    public AsaasItem[] Items { get; set; } = [];
    public string? Customer { get; set; }
    public AsaasCustomerData? CustomerData { get; set; }
    public AsaasSubscription Subscription { get; set; } = new();
}

internal sealed class AsaasCustomerData
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

internal sealed class AsaasCallback
{
    public string SuccessUrl { get; set; } = string.Empty;
    public string CancelUrl { get; set; } = string.Empty;
    public string ExpiredUrl { get; set; } = string.Empty;
}

internal sealed class AsaasItem
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public decimal Value { get; set; }
}

internal sealed class AsaasSubscription
{
    public string Cycle { get; set; } = BillingPricing.Yearly;
    public string NextDueDate { get; set; } = string.Empty;
}

internal sealed class AsaasCheckoutCreated
{
    public string Id { get; set; } = string.Empty;
    public string? Link { get; set; }
}

internal sealed class AsaasListResponse<T>
{
    public List<T> Data { get; set; } = [];
    public bool HasMore { get; set; }
}

internal sealed class AsaasListedSubscription
{
    public string Id { get; set; } = string.Empty;
}

internal sealed class AsaasListedPayment
{
    public string? Status { get; set; }
    public string? Customer { get; set; }
    public string? Subscription { get; set; }
    public string? CheckoutSession { get; set; }
}

internal sealed record AsaasConfirmedCheckout(string? SubscriptionId, string? CustomerId);

internal enum AsaasCancellationOutcome
{
    Confirmed,
    Pending,
    ActionRequired
}
