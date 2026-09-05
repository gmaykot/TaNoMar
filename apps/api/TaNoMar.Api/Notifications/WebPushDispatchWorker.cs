using System.Net;
using System.Text.Json;
using Lib.Net.Http.WebPush;
using Lib.Net.Http.WebPush.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TaNoMar.Api.Data;
using TaNoMar.Api.Options;

namespace TaNoMar.Api.Notifications;

public sealed class WebPushDispatchWorker(
    WebPushQueue queue,
    IServiceScopeFactory scopes,
    PushServiceClient push,
    IOptions<TaNoMarOptions> options,
    ILogger<WebPushDispatchWorker> logger) : BackgroundService
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var job in queue.Reader.ReadAllAsync(stoppingToken))
        {
            if (!options.Value.HasVapid)
                continue;
            try
            {
                await SendAsync(job, stoppingToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogWarning(exception, "Falha ao enviar Web Push para {UserId}.", job.UserId);
            }
        }
    }

    private async Task SendAsync(WebPushJob job, CancellationToken cancellationToken)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
        var subscriptions = await db.PushSubscriptions.Where(item => item.UserId == job.UserId).ToListAsync(cancellationToken);
        if (subscriptions.Count == 0)
            return;

        var vapid = new VapidAuthentication(options.Value.VapidPublicKey, options.Value.VapidPrivateKey)
        {
            Subject = options.Value.VapidSubject
        };
        var message = new PushMessage(JsonSerializer.Serialize(new { title = job.Title, body = job.Body }, Json));
        var expired = new List<DevicePushSubscription>();

        foreach (var item in subscriptions)
        {
            var subscription = new PushSubscription
            {
                Endpoint = item.Endpoint
            };
            subscription.SetKey(PushEncryptionKeyName.P256DH, item.P256dh);
            subscription.SetKey(PushEncryptionKeyName.Auth, item.Auth);
            try
            {
                await push.RequestPushMessageDeliveryAsync(subscription, message, vapid, cancellationToken);
            }
            catch (PushServiceClientException exception) when (exception.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound)
            {
                expired.Add(item);
            }
        }

        if (expired.Count == 0)
            return;
        db.PushSubscriptions.RemoveRange(expired);
        await db.SaveChangesAsync(cancellationToken);
    }
}
