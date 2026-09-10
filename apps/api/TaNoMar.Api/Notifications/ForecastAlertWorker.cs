using Microsoft.EntityFrameworkCore;
using TaNoMar.Api.Data;
using TaNoMar.Api.Fishing;

namespace TaNoMar.Api.Notifications;

internal sealed class ForecastAlertWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<ForecastAlertWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        await CheckOnceAsync(stoppingToken);
        while (await timer.WaitForNextTickAsync(stoppingToken))
            await CheckOnceAsync(stoppingToken);
    }

    private async Task CheckOnceAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TaNoMarDbContext>();
            var fishing = scope.ServiceProvider.GetRequiredService<FishingForecastService>();
            var hub = scope.ServiceProvider.GetRequiredService<NotificationRealtimeHub>();
            var push = scope.ServiceProvider.GetRequiredService<WebPushQueue>();
            var alerts = await db.ForecastAlerts.Where(item => item.IsActive).ToListAsync(cancellationToken);
            var spots = await db.FishingSpots.ToDictionaryAsync(item => item.Id, cancellationToken);
            var activeUsers = await db.Users.Where(item => item.IsActive).ToDictionaryAsync(item => item.Id, item => item.PlanCode, cancellationToken);
            var plans = await db.Plans.AsNoTracking().ToDictionaryAsync(item => item.Code, cancellationToken);
            var idealWindRows = await db.EnabledSpots.AsNoTracking()
                .Where(item => item.IdealWindDirectionDegrees != null)
                .Select(item => new { item.UserId, item.FishingSpotId, item.IdealWindDirectionDegrees })
                .ToListAsync(cancellationToken);
            var idealWindSettings = idealWindRows.ToDictionary(item => (item.UserId, item.FishingSpotId), item => item.IdealWindDirectionDegrees);

            foreach (var alert in alerts)
            {
                if (!activeUsers.TryGetValue(alert.UserId, out var planCode)) continue;
                var preference = await db.UserPreferences.AsNoTracking().SingleOrDefaultAsync(item => item.UserId == alert.UserId, cancellationToken);
                if (preference?.ForecastNotifications == false) continue;
                if (!spots.TryGetValue(alert.FishingSpotId, out var spot)) continue;
                if (!SpotRules.Owns(spot, alert.UserId)
                    && (!SpotRules.IsCommunityVisible(spot) || !SpotRules.IsIncludedInPlan(spot, planCode)))
                    continue;
                var daysAhead = alert.LeadHours <= 12 ? 0 : (alert.LeadHours + 23) / 24;
                var date = fishing.Today().AddDays(daysAhead);
                if (alert.LastNotifiedDate == date) continue;
                var forecast = await fishing.GetLocationDayAsync(new FishingLocation
                {
                    Id = spot.Slug,
                    Name = spot.Name,
                    Latitude = spot.Latitude ?? 0,
                    Longitude = spot.Longitude ?? 0,
                    SeaOrientationDegrees = spot.SeaOrientationDegrees,
                    Profile = spot.Profile,
                }, date, cancellationToken);
                if (forecast is not null && plans.GetValueOrDefault(planCode)?.CanCustomWind == true)
                {
                    idealWindSettings.TryGetValue((alert.UserId, alert.FishingSpotId), out var idealWindDirection);
                    forecast = FishingWindPreference.Apply(forecast, idealWindDirection, spot.SeaOrientationDegrees, spot.Profile);
                }
                if (forecast is null || forecast.Score < alert.MinimumScore) continue;

                var title = $"Boa janela em {spot.Name}";
                var body = $"Nota {forecast.Score:0.0} para {date:dd/MM}. Melhor horário: {forecast.BestHour?.Time ?? "consulte a previsão"}.";
                db.Notifications.Add(new Notification { UserId = alert.UserId, Title = title, Body = body, Region = spot.Region });
                alert.LastNotifiedDate = date;
                alert.UpdatedAt = DateTimeOffset.UtcNow;
                await db.SaveChangesAsync(cancellationToken);
                hub.Publish(alert.UserId, true);
                push.Enqueue(alert.UserId, title, body);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Falha ao avaliar alertas de previsão.");
        }
    }
}
