using Xunit;

namespace TaNoMar.Api.Tests;

public sealed class FishingForecastMissingDataAcceptanceTests
{
    [Fact(Skip = "Pending: nullable ingestion is not implemented; missing WindSpeed currently becomes 0 and can inflate the score. Expected future result: score unavailable.")]
    public void Missing_wind_speed_makes_score_unavailable() => Assert.Fail("Pending acceptance test.");

    [Fact(Skip = "Pending: nullable ingestion is not implemented; missing WindDirection currently becomes 0. Expected future result: score unavailable.")]
    public void Missing_wind_direction_makes_score_unavailable() => Assert.Fail("Pending acceptance test.");

    [Fact(Skip = "Pending: nullable ingestion is not implemented; missing WindGust currently becomes 0 and removes its penalty. Expected future result: score unavailable.")]
    public void Missing_wind_gust_makes_score_unavailable() => Assert.Fail("Pending acceptance test.");

    [Fact(Skip = "Pending: nullable ingestion is not implemented; missing WaveHeight currently becomes 0. Expected future result: score unavailable.")]
    public void Missing_wave_height_makes_score_unavailable() => Assert.Fail("Pending acceptance test.");

    [Fact(Skip = "Pending: nullable ingestion is not implemented; missing WavePeriod currently becomes 0. Expected future result: score unavailable.")]
    public void Missing_wave_period_makes_score_unavailable() => Assert.Fail("Pending acceptance test.");

    [Fact(Skip = "Pending: nullable ingestion is not implemented; missing Weather RainProbability currently becomes 0. Expected future result: score unavailable.")]
    public void Missing_weather_rain_probability_makes_score_unavailable() => Assert.Fail("Pending acceptance test.");

    [Fact(Skip = "Pending: nullable ingestion is not implemented; missing GFS RainProbability currently becomes 0. Expected future result: score unavailable.")]
    public void Missing_gfs_rain_probability_makes_score_unavailable() => Assert.Fail("Pending acceptance test.");

    [Fact(Skip = "Pending: nullable ingestion is not implemented; missing Weather RainAmount currently becomes 0. Expected future result: score unavailable.")]
    public void Missing_weather_rain_amount_makes_score_unavailable() => Assert.Fail("Pending acceptance test.");

    [Fact(Skip = "Pending: nullable ingestion is not implemented; missing GFS RainAmount currently becomes 0. Expected future result: score unavailable.")]
    public void Missing_gfs_rain_amount_makes_score_unavailable() => Assert.Fail("Pending acceptance test.");

    [Fact(Skip = "Pending: nullable evaluation is not implemented; multiple missing inputs currently flow as zeros. Expected future result: score unavailable.")]
    public void Multiple_missing_fields_make_score_unavailable() => Assert.Fail("Pending acceptance test.");

    [Fact(Skip = "Pending: nullable evaluation is not implemented; null source elements currently normalize to zero. Expected future result: score unavailable.")]
    public void Null_source_element_makes_score_unavailable() => Assert.Fail("Pending acceptance test.");

    [Fact(Skip = "Pending: nullable evaluation is not implemented; absent fields/lists currently normalize to zero. Expected future result: score unavailable.")]
    public void Missing_field_or_list_makes_score_unavailable() => Assert.Fail("Pending acceptance test.");

    [Fact(Skip = "Pending: nullable evaluation is not implemented; short lists currently return zero outside their range. Expected future result: score unavailable.")]
    public void Short_source_list_makes_score_unavailable() => Assert.Fail("Pending acceptance test.");

    [Fact(Skip = "Pending: timestamp alignment currently maps unmatched GFS data to zero. Expected future result: score unavailable.")]
    public void Unmatched_gfs_timestamp_makes_score_unavailable() => Assert.Fail("Pending acceptance test.");

    [Fact(Skip = "Pending: timestamp alignment currently maps unmatched Marine data to zero. Expected future result: score unavailable.")]
    public void Unmatched_marine_timestamp_makes_score_unavailable() => Assert.Fail("Pending acceptance test.");

    [Fact(Skip = "Pending: known bug 8.9 at 06:00 with praia_aberta, orientation 180 and external inputs absent; currently zeros produce an excellent score. Expected future result: unavailable, not 8.9.")]
    public void Known_bug_89_must_become_unavailable()
        => Assert.Fail("Pending acceptance test: current BuildForecast behavior is the documented bug.");
}
