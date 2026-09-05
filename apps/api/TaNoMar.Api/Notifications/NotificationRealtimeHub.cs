using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Threading.Channels;

namespace TaNoMar.Api.Notifications;

public sealed record NotificationInboxPing(bool Unread);

public sealed class NotificationRealtimeHub
{
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<Guid, Channel<NotificationInboxPing>>> _subscribers = new();

    public async IAsyncEnumerable<NotificationInboxPing> Subscribe(Guid userId, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var connectionId = Guid.NewGuid();
        var channel = Channel.CreateUnbounded<NotificationInboxPing>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });
        var connections = _subscribers.GetOrAdd(userId, _ => new ConcurrentDictionary<Guid, Channel<NotificationInboxPing>>());
        connections[connectionId] = channel;
        try
        {
            await foreach (var ping in channel.Reader.ReadAllAsync(cancellationToken))
                yield return ping;
        }
        finally
        {
            connections.TryRemove(connectionId, out _);
            if (connections.IsEmpty)
                _subscribers.TryRemove(userId, out _);
        }
    }

    public void Publish(Guid userId, bool unread)
    {
        if (!_subscribers.TryGetValue(userId, out var connections))
            return;
        var ping = new NotificationInboxPing(unread);
        foreach (var channel in connections.Values)
            channel.Writer.TryWrite(ping);
    }
}
