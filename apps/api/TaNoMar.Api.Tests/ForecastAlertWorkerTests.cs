using TaNoMar.Api.Fishing;
using TaNoMar.Api.Notifications;
using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class ForecastAlertWorkerTests
{
    [Fact]
    public void Daily_unavailable_forecast_never_produces_an_alert_score()
    {
        var hour = new FishingHourForecast(
            "06:00", 8.5, 8, 10, "Leste", 0, 20, 18, 0, 0, 0,
            0.8, 8, 0.5, 7, "Leste", "Leste", null, 1012);
        var forecast = new FishingLocationForecast(
            "spot", "Spot", new DateOnly(2026, 9, 27), null, [], null, [hour]);

        Assert.Null(ForecastAlertWorker.ScoreForAlert(forecast, null));
        Assert.Null(ForecastAlertWorker.ScoreForAlert(forecast, 6));
    }
}
