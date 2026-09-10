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
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan RecheckDelay = TimeSpan.FromSeconds(5);
    private readonly ConcurrentDictionary<string, CachedWorkerSettings> _cache = new();
    private readonly FishingOptions _fishingOptions = fishingOptions.Value;
    private readonly TimeZoneInfo _timeZone = TimeZoneInfo.FindSystemTimeZoneById(fishingOptions.Value.TimeZone);

    public string TimeZoneId => _timeZone.Id;

    public async Task<WorkerSettingsSnapshot> GetAsync(string key, CancellationToken cancellationToken)
    {
        var definition = WorkerCatalog.Find(key)
            ?? throw new InvalidOperationException($"Worker desconhecido: {key}.");
        var now = DateTimeOffset.UtcNow;
        if (_cache.TryGetValue(key, out var cached) && cached.ExpiresAt > now)
            return cached.Settings;

        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            var configured = await db.WorkerConfigurations.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Key == key, cancellationToken);
            var settings = configured is null
                ? DefaultSettings(definition)
                : new WorkerSettingsSnapshot(key, configured.IsEnabled, configured.CronExpression);
            _cache[key] = new CachedWorkerSettings(settings, now.Add(CacheDuration));
            return settings;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Falha ao ler a configuração do worker {WorkerKey}.", key);
            return cached?.Settings ?? DefaultSettings(definition);
        }
    }

    public void Invalidate(string key) => _cache.TryRemove(key, out _);

    public async Task WaitUntilEnabledAsync(string key, CancellationToken cancellationToken)
    {
        while (!(await GetAsync(key, cancellationToken)).IsEnabled)
            await Task.Delay(RecheckDelay, cancellationToken);
    }

    public async Task WaitForNextRunAsync(string key, CancellationToken cancellationToken)
    {
        while (true)
        {
            var settings = await GetAsync(key, cancellationToken);
            if (!settings.IsEnabled || settings.CronExpression is null)
            {
                await Task.Delay(RecheckDelay, cancellationToken);
                continue;
            }

            var expression = CronExpression.Parse(settings.CronExpression);
            var nextRun = expression.GetNextOccurrence(DateTimeOffset.UtcNow, _timeZone);
            if (nextRun is null)
            {
                await Task.Delay(RecheckDelay, cancellationToken);
                continue;
            }

            while (true)
            {
                var remaining = nextRun.Value - DateTimeOffset.UtcNow;
                if (remaining <= TimeSpan.Zero)
                    return;

                await Task.Delay(remaining < RecheckDelay ? remaining : RecheckDelay, cancellationToken);
                var latest = await GetAsync(key, cancellationToken);
                if (latest != settings)
                    break;
            }
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

    private sealed record CachedWorkerSettings(WorkerSettingsSnapshot Settings, DateTimeOffset ExpiresAt);
}
