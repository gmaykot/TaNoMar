using System.Threading.Channels;

namespace TaNoMar.Api.Notifications;

public sealed record WebPushJob(Guid UserId, string Title, string Body);

public sealed class WebPushQueue
{
    private readonly Channel<WebPushJob> _jobs = Channel.CreateUnbounded<WebPushJob>(new UnboundedChannelOptions
    {
        SingleReader = true,
        SingleWriter = false
    });

    public ChannelReader<WebPushJob> Reader => _jobs.Reader;

    public void Enqueue(Guid userId, string title, string body) =>
        _jobs.Writer.TryWrite(new WebPushJob(userId, title, body));
}
