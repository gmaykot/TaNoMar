using System.Collections.Concurrent;
using System.Threading.Channels;
using Microsoft.Extensions.Options;
using TaNoMar.Api.Workers;

namespace TaNoMar.Api.Fishing;

internal sealed class FishingForecastRefreshQueue
{
    private static readonly TimeSpan FailureRetention = TimeSpan.FromMinutes(15);
    private readonly Channel<FishingLocation> _channel;
    private readonly ConcurrentDictionary<string, byte> _pending = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, DateTimeOffset> _failures = new(StringComparer.Ordinal);

    public FishingForecastRefreshQueue(IOptions<FishingOptions> options)
    {
        _channel = Channel.CreateBounded<FishingLocation>(new BoundedChannelOptions(
            Math.Max(1, options.Value.RefreshQueueCapacity))
        {
            SingleReader = false,
            SingleWriter = false,
            FullMode = BoundedChannelFullMode.Wait
        });
    }

    public int PendingCount => _pending.Count;

    public bool Enqueue(FishingLocation location)
    {
        if (string.IsNullOrWhiteSpace(location.Id) || !_pending.TryAdd(location.Id, 0))
            return false;

        if (_channel.Writer.TryWrite(location))
            return true;

        _pending.TryRemove(location.Id, out _);
        return false;
    }

    public ForecastRefreshSnapshot Snapshot(IEnumerable<string> spotIds)
    {
        var now = DateTimeOffset.UtcNow;
        var ids = spotIds.ToHashSet(StringComparer.Ordinal);
        foreach (var failure in _failures)
        {
            if (now - failure.Value > FailureRetention)
                _failures.TryRemove(failure.Key, out _);
        }

        return new ForecastRefreshSnapshot(
            _pending.Keys.Where(ids.Contains).OrderBy(item => item, StringComparer.Ordinal).ToArray(),
            _failures.Where(item => ids.Contains(item.Key))
                .Select(item => item.Key)
                .OrderBy(item => item, StringComparer.Ordinal)
                .ToArray());
    }

    internal ValueTask<FishingLocation> ReadAsync(CancellationToken cancellationToken)
        => _channel.Reader.ReadAsync(cancellationToken);

    internal bool TryRead(out FishingLocation location)
        => _channel.Reader.TryRead(out location!);

    internal void Complete(
        IEnumerable<FishingLocation> locations,
        IReadOnlySet<string>? succeededLocationIds)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var location in locations)
        {
            _pending.TryRemove(location.Id, out _);
            if (succeededLocationIds?.Contains(location.Id) == true)
                _failures.TryRemove(location.Id, out _);
            else
                _failures[location.Id] = now;
        }
    }
}

internal sealed class FishingTideEnrichmentQueue
{
    private readonly Channel<FishingLocation> _channel;
    private readonly ConcurrentDictionary<string, byte> _pending = new(StringComparer.Ordinal);

    public FishingTideEnrichmentQueue(IOptions<FishingOptions> options)
    {
        _channel = Channel.CreateBounded<FishingLocation>(new BoundedChannelOptions(
            Math.Max(1, options.Value.RefreshQueueCapacity))
        {
            SingleReader = true,
            SingleWriter = false,
            FullMode = BoundedChannelFullMode.Wait
        });
    }

    public bool Enqueue(FishingLocation location)
    {
        if (string.IsNullOrWhiteSpace(location.Id) || !_pending.TryAdd(location.Id, 0))
            return false;

        if (_channel.Writer.TryWrite(location))
            return true;

        _pending.TryRemove(location.Id, out _);
        return false;
    }

    internal ValueTask<FishingLocation> ReadAsync(CancellationToken cancellationToken)
        => _channel.Reader.ReadAsync(cancellationToken);

    internal void Complete(string locationId)
        => _pending.TryRemove(locationId, out _);
}

internal sealed class FishingForecastRefreshWorker(
    IServiceScopeFactory scopeFactory,
    FishingForecastRefreshQueue queue,
    IOptions<FishingOptions> options,
    WorkerSettingsService workerSettings,
    ILogger<FishingForecastRefreshWorker> logger) : BackgroundService
{
    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var concurrency = Math.Max(1, options.Value.RefreshConcurrency);
        return Task.WhenAll(Enumerable.Range(0, concurrency)
            .Select(_ => ConsumeAsync(stoppingToken)));
    }

    private async Task ConsumeAsync(CancellationToken cancellationToken)
    {
        var batchSize = Math.Max(1, options.Value.RefreshBatchSize);
        while (!cancellationToken.IsCancellationRequested)
        {
            await workerSettings.WaitUntilEnabledAsync(WorkerCatalog.ForecastRefresh, cancellationToken);
            var batch = new List<FishingLocation>
            {
                await queue.ReadAsync(cancellationToken)
            };
            await workerSettings.WaitUntilEnabledAsync(WorkerCatalog.ForecastRefresh, cancellationToken);
            await Task.Delay(TimeSpan.FromMilliseconds(50), cancellationToken);
            while (batch.Count < batchSize && queue.TryRead(out var location))
                batch.Add(location);

            var started = DateTimeOffset.UtcNow;
            IReadOnlySet<string>? succeededLocationIds = null;
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var fishing = scope.ServiceProvider.GetRequiredService<FishingForecastService>();
                succeededLocationIds = await fishing.RefreshBatchAsync(batch, cancellationToken);
                logger.LogInformation(
                    "Previsões atualizadas em lote: {Succeeded}/{Locations} locais em {ElapsedMs}ms; fila restante {Pending}.",
                    succeededLocationIds.Count,
                    batch.Count,
                    (DateTimeOffset.UtcNow - started).TotalMilliseconds.ToString("0"),
                    queue.PendingCount - batch.Count);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                logger.LogWarning(
                    exception,
                    "Falha ao atualizar lote de {Locations} locais após {ElapsedMs}ms.",
                    batch.Count,
                    (DateTimeOffset.UtcNow - started).TotalMilliseconds.ToString("0"));
            }
            finally
            {
                queue.Complete(batch, succeededLocationIds);
            }
        }
    }
}

internal sealed class FishingTideEnrichmentWorker(
    IServiceScopeFactory scopeFactory,
    FishingTideEnrichmentQueue queue,
    WorkerSettingsService workerSettings,
    ILogger<FishingTideEnrichmentWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await workerSettings.WaitUntilEnabledAsync(WorkerCatalog.TideEnrichment, stoppingToken);
            var location = await queue.ReadAsync(stoppingToken);
            await workerSettings.WaitUntilEnabledAsync(WorkerCatalog.TideEnrichment, stoppingToken);
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var fishing = scope.ServiceProvider.GetRequiredService<FishingForecastService>();
                await fishing.EnrichTidesAsync(location, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Falha ao completar maré de {LocationId}.", location.Id);
            }
            finally
            {
                queue.Complete(location.Id);
            }
        }
    }
}
