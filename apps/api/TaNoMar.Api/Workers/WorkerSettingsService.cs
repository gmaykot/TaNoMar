using System.Collections.Concurrent;
using Cronos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TaNoMar.Api.Data;
using TaNoMar.Api.Fishing;

namespace TaNoMar.Api.Workers;

internal sealed record WorkerSettingsSnapshot(string Key, bool IsEnabled, string? CronExpression);

internal sealed class WorkerSettingsService(
    IServiceScopeFactory scopeFactory,
    IOptions<FishingOptions> fishingOptions,
    ILogger<WorkerSettingsService> logger)
{
    private readonly ConcurrentDictionary<string, WorkerSettingsSnapshot> _cache = new();
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _changeSignals = new();
    private readonly FishingOptions _fishingOptions = fishingOptions.Value;
    private readonly TimeZoneInfo _timeZone = TimeZoneInfo.FindSystemTimeZoneById(fishingOptions.Value.TimeZone);

    public string TimeZoneId => _timeZone.Id;

    public async Task<WorkerSettingsSnapshot> GetAsync(string key, CancellationToken cancellationToken)
    {
        var definition = WorkerCatalog.Find(key)
            ?? throw new InvalidOperationException($"Worker desconhecido: {key}.");
        if (_cache.TryGetValue(key, out var cached))
            return cached;

        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            var configured = await db.WorkerConfigurations.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Key == key, cancellationToken);
            var settings = configured is null
                ? DefaultSettings(definition)
                : new WorkerSettingsSnapshot(key, configured.IsEnabled, configured.CronExpression);
            _cache[key] = settings;
            return settings;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Falha ao ler a configuração do worker {WorkerKey}.", key);
            return cached ?? DefaultSettings(definition);
        }
    }

    public void Invalidate(string key)
    {
        _cache.TryRemove(key, out _);
        if (!_changeSignals.TryRemove(key, out var signal))
            return;
        signal.Cancel();
        signal.Dispose();
    }

    public async Task WaitUntilEnabledAsync(string key, CancellationToken cancellationToken)
    {
        while (!(await GetAsync(key, cancellationToken)).IsEnabled)
            await WaitForChangeOrDelayAsync(key, null, cancellationToken);
    }

    public async Task WaitForNextRunAsync(string key, CancellationToken cancellationToken)
    {
        while (true)
        {
            var changed = Watch(key);
            var settings = await GetAsync(key, cancellationToken);
            if (!settings.IsEnabled || settings.CronExpression is null)
            {
                await WaitForChangeOrDelayAsync(changed, null, cancellationToken);
                continue;
            }

            var expression = CronExpression.Parse(settings.CronExpression);
            var nextRun = expression.GetNextOccurrence(DateTimeOffset.UtcNow, _timeZone);
            if (nextRun is null)
            {
                await WaitForChangeOrDelayAsync(changed, null, cancellationToken);
                continue;
            }

            var remaining = nextRun.Value - DateTimeOffset.UtcNow;
            if (remaining <= TimeSpan.Zero)
                return;

            await WaitForChangeOrDelayAsync(changed, remaining, cancellationToken);
            if (!changed.IsCancellationRequested)
                return;
        }
    }

    private CancellationToken Watch(string key) =>
        _changeSignals.GetOrAdd(key, static _ => new CancellationTokenSource()).Token;

    private Task WaitForChangeOrDelayAsync(string key, TimeSpan? delay, CancellationToken cancellationToken) =>
        WaitForChangeOrDelayAsync(Watch(key), delay, cancellationToken);

    private static async Task WaitForChangeOrDelayAsync(
        CancellationToken changed,
        TimeSpan? delay,
        CancellationToken cancellationToken)
    {
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(changed, cancellationToken);
        try
        {
            await Task.Delay(delay ?? Timeout.InfiniteTimeSpan, linked.Token);
        }
        catch (OperationCanceledException) when (changed.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
        {
        }
    }

    private WorkerSettingsSnapshot DefaultSettings(WorkerDefinition definition)
    {
        var enabled = definition.Key != WorkerCatalog.ForecastWarmup || _fishingOptions.WarmupEnabled;
        var cron = definition.Key == WorkerCatalog.ForecastWarmup
            ? WorkerCatalog.WarmupDefaultCron(_fishingOptions)
            : definition.DefaultCronExpression;
        return new WorkerSettingsSnapshot(definition.Key, enabled, cron);
    }
}
