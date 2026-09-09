using System.Globalization;

namespace TaNoMar.Api.Fishing;

internal static class FishingForecastAudit
{
    public static FishingForecastAuditReport Run(
        FishingLocation location,
        FishingLocationForecast forecast,
        FishingForecastAuditSources? sources = null)
    {
        var findings = new List<FishingForecastAuditFinding>();
        var hours = forecast.Hours ?? [];

        if (!string.Equals(location.Id, forecast.Id, StringComparison.Ordinal))
            Add(findings, "error", "identity.locationId", "O local do snapshot não corresponde ao local auditado.");
        if (!string.Equals(location.Name, forecast.Location, StringComparison.Ordinal))
            Add(findings, "warning", "identity.locationName", "O nome do local diverge da configuração atual.");
        if (hours.Count == 0)
        {
            Add(findings, "error", "hours", "O forecast não possui horas normalizadas.");
            return Report(location, forecast, findings, sources is not null, sources);
        }

        var times = new HashSet<string>(StringComparer.Ordinal);
        var previousTime = string.Empty;
        foreach (var hour in hours)
        {
            if (!TimeSpan.TryParseExact(hour.Time, "hh\\:mm", CultureInfo.InvariantCulture, out var time))
                Add(findings, "error", $"hours[{hour.Time}].time", "Horário fora do formato HH:mm.");
            else if (time.TotalHours >= 24)
                Add(findings, "error", $"hours[{hour.Time}].time", "Horário fora do intervalo diário.");

            if (!times.Add(hour.Time))
                Add(findings, "error", $"hours[{hour.Time}].time", "Horário duplicado.");
            if (string.CompareOrdinal(hour.Time, previousTime) < 0)
                Add(findings, "error", $"hours[{hour.Time}].time", "Horas fora de ordem cronológica.");
            previousTime = hour.Time;

            CheckFinite(findings, hour);
            CheckRanges(findings, hour);
        }

        if (!double.IsFinite(forecast.Score) || forecast.Score is < 0 or > 10)
            Add(findings, "error", "score", "Nota do local fora do intervalo 0–10.");

        var expectedBest = hours
            .Where(hour => int.TryParse(hour.Time.AsSpan(0, Math.Min(2, hour.Time.Length)), out var value) && value is >= 5 and <= 20)
            .OrderByDescending(hour => hour.Score)
            .ThenBy(hour => hour.Time, StringComparer.Ordinal)
            .Take(3)
            .Select(hour => hour.Time)
            .ToArray();
        var actualBest = (forecast.BestHours ?? []).Select(hour => hour.Time).ToArray();
        if (!expectedBest.SequenceEqual(actualBest, StringComparer.Ordinal))
            Add(findings, "error", "bestHours", "Melhores horas não correspondem às três maiores notas entre 05h e 20h.");

        if (forecast.BestHour is not null && (actualBest.Length == 0 || forecast.BestHour.Time != actualBest[0]))
            Add(findings, "error", "bestHour", "BestHour não corresponde à primeira melhor hora.");

        var expectedScore = expectedBest.Length == 0
            ? 0.0
            : Math.Round(
                hours.Where(hour => expectedBest.Contains(hour.Time, StringComparer.Ordinal)).Average(hour => hour.Score),
                1,
                MidpointRounding.ToEven);
        if (forecast.Score != expectedScore)
            Add(findings, "error", "score", $"Nota agregada divergente. Esperado {expectedScore:0.0}, encontrado {forecast.Score:0.0}.");

        if (sources is not null)
            CompareSources(location, forecast, sources, findings);

        return Report(location, forecast, findings, sources is not null, sources);
    }

    private static FishingForecastAuditReport Report(
        FishingLocation location,
        FishingLocationForecast forecast,
        IReadOnlyList<FishingForecastAuditFinding> findings,
        bool rawSourceComparisonAvailable,
        FishingForecastAuditSources? sources)
        => new(
            location.Id,
            forecast.Date,
            forecast.Hours?.Count ?? 0,
            forecast.BestHours?.Count ?? 0,
            findings.All(item => item.Severity != "error"),
            rawSourceComparisonAvailable,
            findings,
            BuildHours(location, forecast, sources));

    private static IReadOnlyList<FishingForecastAuditHour> BuildHours(
        FishingLocation location,
        FishingLocationForecast forecast,
        FishingForecastAuditSources? sources)
    {
        var bestTimes = (forecast.BestHours ?? []).Select(hour => hour.Time).ToHashSet(StringComparer.Ordinal);
        var weatherIndexes = sources is null ? null : IndexTimes(sources.Weather.Hourly.Time);
        var gfsIndexes = sources is null ? null : IndexTimes(sources.GfsRain.Hourly.Time);
        var marineIndexes = sources is null ? null : IndexTimes(sources.Marine.Hourly.Time);

        return (forecast.Hours ?? []).Select(hour => new FishingForecastAuditHour(
            hour.Time,
            bestTimes.Contains(hour.Time),
            new FishingForecastAuditNormalized(
                hour.Score,
                hour.WindSpeedKmh,
                hour.WindGustKmh,
                hour.WindDirection,
                hour.RainMm,
                hour.RainProbability,
                hour.RainProbabilityBestMatch,
                hour.RainProbabilityGfs,
                hour.AirTemperatureC,
                hour.WaterTemperatureC,
                hour.WaveMeters,
                hour.WavePeriodSeconds,
                hour.SwellMeters,
                hour.SwellPeriodSeconds,
                hour.WaveDirection,
                hour.SwellDirection,
                hour.SeaLevelHeightMsl,
                hour.PressureHpa),
            sources is null
                ? null
                : BuildSourceValues(location, forecast, hour, sources, weatherIndexes!, gfsIndexes!, marineIndexes!))).ToList();
    }

    private static FishingForecastAuditSourcesView? BuildSourceValues(
        FishingLocation location,
        FishingLocationForecast forecast,
        FishingHourForecast hour,
        FishingForecastAuditSources sources,
        IReadOnlyDictionary<string, int> weatherIndexes,
        IReadOnlyDictionary<string, int> gfsIndexes,
        IReadOnlyDictionary<string, int> marineIndexes)
    {
        var timestamp = $"{forecast.Date:yyyy-MM-dd}T{hour.Time}";
        if (!weatherIndexes.TryGetValue(timestamp, out var weatherIndex)
            || !gfsIndexes.TryGetValue(timestamp, out var gfsIndex)
            || !marineIndexes.TryGetValue(timestamp, out var marineIndex))
            return null;

        var speed = ValueAt(sources.Weather.Hourly.WindSpeed, weatherIndex);
        var gust = ValueAt(sources.Weather.Hourly.WindGusts, weatherIndex);
        var windDirection = ValueAt(sources.Weather.Hourly.WindDirection, weatherIndex);
        var rainBestMm = ValueAt(sources.Weather.Hourly.Precipitation, weatherIndex);
        var rainBestProbability = ValueAt(sources.Weather.Hourly.PrecipitationProbability, weatherIndex);
        var rainGfsMm = ValueAt(sources.GfsRain.Hourly.Precipitation, gfsIndex);
        var rainGfsProbability = ValueAt(sources.GfsRain.Hourly.PrecipitationProbability, gfsIndex);
        var waveHeight = ValueAt(sources.Marine.Hourly.WaveHeight, marineIndex);
        var waveDirection = ValueAt(sources.Marine.Hourly.WaveDirection, marineIndex);
        var wavePeriod = ValueAt(sources.Marine.Hourly.WavePeriod, marineIndex);
        var swellHeight = ValueAt(sources.Marine.Hourly.SwellHeight, marineIndex);
        var swellDirection = ValueAt(sources.Marine.Hourly.SwellDirection, marineIndex);
        var swellPeriod = ValueAt(sources.Marine.Hourly.SwellPeriod, marineIndex);
        var hourNumber = int.TryParse(hour.Time.AsSpan(0, Math.Min(2, hour.Time.Length)), out var parsedHour)
            ? parsedHour
            : 0;
        var sourceScore = FishingScoreCalculator.Calculate(
            speed,
            gust,
            windDirection,
            location.SeaOrientationDegrees,
            waveHeight,
            wavePeriod,
            Math.Max(rainBestProbability, rainGfsProbability),
            Math.Max(rainBestMm, rainGfsMm),
            hourNumber,
            location.Profile);

        return new FishingForecastAuditSourcesView(
            sourceScore,
            new FishingForecastAuditWeather(
                NullableValueAt(sources.Weather.Hourly.WindSpeed, weatherIndex),
                NullableValueAt(sources.Weather.Hourly.WindGusts, weatherIndex),
                NullableValueAt(sources.Weather.Hourly.WindDirection, weatherIndex),
                NullableValueAt(sources.Weather.Hourly.Precipitation, weatherIndex),
                NullableValueAt(sources.Weather.Hourly.PrecipitationProbability, weatherIndex),
                NullableValueAt(sources.Weather.Hourly.Temperature, weatherIndex),
                NullableValueAt(sources.Weather.Hourly.PressureMsl, weatherIndex)),
            new FishingForecastAuditGfsRain(
                NullableValueAt(sources.GfsRain.Hourly.Precipitation, gfsIndex),
                NullableValueAt(sources.GfsRain.Hourly.PrecipitationProbability, gfsIndex)),
            new FishingForecastAuditMarine(
                NullableValueAt(sources.Marine.Hourly.WaveHeight, marineIndex),
                NullableValueAt(sources.Marine.Hourly.WaveDirection, marineIndex),
                NullableValueAt(sources.Marine.Hourly.WavePeriod, marineIndex),
                NullableValueAt(sources.Marine.Hourly.SwellHeight, marineIndex),
                NullableValueAt(sources.Marine.Hourly.SwellDirection, marineIndex),
                NullableValueAt(sources.Marine.Hourly.SwellPeriod, marineIndex),
                NullableValueAt(sources.Marine.Hourly.WaterTemperature, marineIndex)));
    }

    private static void CompareSources(
        FishingLocation location,
        FishingLocationForecast forecast,
        FishingForecastAuditSources sources,
        List<FishingForecastAuditFinding> findings)
    {
        CheckSourceTimeline("weather", sources.Weather.Hourly.Time, findings);
        CheckSourceTimeline("gfsRain", sources.GfsRain.Hourly.Time, findings);
        CheckSourceTimeline("marine", sources.Marine.Hourly.Time, findings);
        CheckSourceSeriesLengths(
            "weather",
            sources.Weather.Hourly.Time.Count,
            findings,
            ("windSpeed", sources.Weather.Hourly.WindSpeed),
            ("windGusts", sources.Weather.Hourly.WindGusts),
            ("windDirection", sources.Weather.Hourly.WindDirection),
            ("precipitation", sources.Weather.Hourly.Precipitation),
            ("precipitationProbability", sources.Weather.Hourly.PrecipitationProbability),
            ("temperature", sources.Weather.Hourly.Temperature),
            ("pressureMsl", sources.Weather.Hourly.PressureMsl));
        CheckSourceSeriesLengths(
            "gfsRain",
            sources.GfsRain.Hourly.Time.Count,
            findings,
            ("precipitation", sources.GfsRain.Hourly.Precipitation),
            ("precipitationProbability", sources.GfsRain.Hourly.PrecipitationProbability));
        CheckSourceSeriesLengths(
            "marine",
            sources.Marine.Hourly.Time.Count,
            findings,
            ("waveHeight", sources.Marine.Hourly.WaveHeight),
            ("waveDirection", sources.Marine.Hourly.WaveDirection),
            ("wavePeriod", sources.Marine.Hourly.WavePeriod),
            ("swellHeight", sources.Marine.Hourly.SwellHeight),
            ("swellDirection", sources.Marine.Hourly.SwellDirection),
            ("swellPeriod", sources.Marine.Hourly.SwellPeriod),
            ("waterTemperature", sources.Marine.Hourly.WaterTemperature));

        var weatherIndexes = IndexTimes(sources.Weather.Hourly.Time);
        var gfsIndexes = IndexTimes(sources.GfsRain.Hourly.Time);
        var marineIndexes = IndexTimes(sources.Marine.Hourly.Time);
        foreach (var hour in forecast.Hours)
        {
            var timestamp = $"{forecast.Date:yyyy-MM-dd}T{hour.Time}";
            if (!weatherIndexes.TryGetValue(timestamp, out var weatherIndex))
            {
                Add(findings, "error", $"source.weather[{timestamp}]", "Horário normalizado ausente na fonte Weather.");
                continue;
            }
            if (!gfsIndexes.TryGetValue(timestamp, out var gfsIndex))
            {
                Add(findings, "error", $"source.gfsRain[{timestamp}]", "Horário normalizado ausente na fonte GFS.");
                continue;
            }
            if (!marineIndexes.TryGetValue(timestamp, out var marineIndex))
            {
                Add(findings, "error", $"source.marine[{timestamp}]", "Horário normalizado ausente na fonte Marine.");
                continue;
            }

            var speed = ValueAt(sources.Weather.Hourly.WindSpeed, weatherIndex);
            var gust = ValueAt(sources.Weather.Hourly.WindGusts, weatherIndex);
            var windDirection = ValueAt(sources.Weather.Hourly.WindDirection, weatherIndex);
            var rainBestMm = ValueAt(sources.Weather.Hourly.Precipitation, weatherIndex);
            var rainBestProbability = ValueAt(sources.Weather.Hourly.PrecipitationProbability, weatherIndex);
            var rainGfsMm = ValueAt(sources.GfsRain.Hourly.Precipitation, gfsIndex);
            var rainGfsProbability = ValueAt(sources.GfsRain.Hourly.PrecipitationProbability, gfsIndex);
            var rainProbability = Math.Max(rainBestProbability, rainGfsProbability);
            var rainMm = Math.Max(rainBestMm, rainGfsMm);
            var waveHeight = ValueAt(sources.Marine.Hourly.WaveHeight, marineIndex);
            var waveDirection = ValueAt(sources.Marine.Hourly.WaveDirection, marineIndex);
            var wavePeriod = ValueAt(sources.Marine.Hourly.WavePeriod, marineIndex);
            var swellHeight = ValueAt(sources.Marine.Hourly.SwellHeight, marineIndex);
            var swellDirection = ValueAt(sources.Marine.Hourly.SwellDirection, marineIndex);
            var swellPeriod = ValueAt(sources.Marine.Hourly.SwellPeriod, marineIndex);
            var airTemperature = ValueAt(sources.Weather.Hourly.Temperature, weatherIndex);
            var waterTemperature = ValueAt(sources.Marine.Hourly.WaterTemperature, marineIndex);
            var pressure = ValueAt(sources.Weather.Hourly.PressureMsl, weatherIndex);
            var hourNumber = int.Parse(hour.Time.AsSpan(0, 2), CultureInfo.InvariantCulture);
            var sourceScore = FishingScoreCalculator.Calculate(
                speed,
                gust,
                windDirection,
                location.SeaOrientationDegrees,
                waveHeight,
                wavePeriod,
                rainProbability,
                rainMm,
                hourNumber,
                location.Profile);

            Compare(findings, hour, "score", hour.Score, sourceScore);
            Compare(findings, hour, "windSpeedKmh", hour.WindSpeedKmh, Round(speed, 1));
            Compare(findings, hour, "windGustKmh", hour.WindGustKmh, Round(gust, 1));
            Compare(findings, hour, "windDirection", hour.WindDirection, CompassDirection(windDirection));
            Compare(findings, hour, "rainMm", hour.RainMm, Round(rainMm, 1));
            Compare(findings, hour, "rainProbability", hour.RainProbability, ToInt(rainProbability));
            Compare(findings, hour, "rainProbabilityBestMatch", hour.RainProbabilityBestMatch, ToInt(rainBestProbability));
            Compare(findings, hour, "rainProbabilityGfs", hour.RainProbabilityGfs, ToInt(rainGfsProbability));
            Compare(findings, hour, "airTemperatureC", hour.AirTemperatureC, Round(airTemperature, 1));
            Compare(findings, hour, "waterTemperatureC", hour.WaterTemperatureC, Round(waterTemperature, 1));
            Compare(findings, hour, "waveMeters", hour.WaveMeters, Round(waveHeight, 2));
            Compare(findings, hour, "wavePeriodSeconds", hour.WavePeriodSeconds, Round(wavePeriod, 1));
            Compare(findings, hour, "swellMeters", hour.SwellMeters, Round(swellHeight, 2));
            Compare(findings, hour, "swellPeriodSeconds", hour.SwellPeriodSeconds, Round(swellPeriod, 1));
            Compare(findings, hour, "waveDirection", hour.WaveDirection, CompassDirection(waveDirection));
            Compare(findings, hour, "swellDirection", hour.SwellDirection, CompassDirection(swellDirection));
            Compare(findings, hour, "pressureHpa", hour.PressureHpa, Round(pressure, 0));
        }
    }

    private static void CheckSourceTimeline(
        string source,
        IReadOnlyList<string> times,
        List<FishingForecastAuditFinding> findings)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var previous = string.Empty;
        for (var index = 0; index < times.Count; index++)
        {
            if (!seen.Add(times[index]))
                Add(findings, "error", $"source.{source}.time[{index}]", "Timestamp duplicado na fonte.");
            if (string.CompareOrdinal(times[index], previous) < 0)
                Add(findings, "error", $"source.{source}.time[{index}]", "Timestamps fora de ordem cronológica na fonte.");
            previous = times[index];
        }
        if (times.Count == 0)
            Add(findings, "error", $"source.{source}.time", "A fonte não retornou timestamps.");
    }

    private static void CheckSourceSeriesLengths(
        string source,
        int timeCount,
        List<FishingForecastAuditFinding> findings,
        params (string Name, IReadOnlyList<double?> Values)[] series)
    {
        foreach (var item in series)
        {
            if (item.Values.Count != timeCount)
                Add(findings, "error", $"source.{source}.{item.Name}", $"Série com {item.Values.Count} valores para {timeCount} timestamps.");
        }
    }

    private static Dictionary<string, int> IndexTimes(IReadOnlyList<string> times)
        => times.Select((time, index) => (time, index))
            .GroupBy(item => item.time, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.First().index, StringComparer.Ordinal);

    private static void Compare(
        List<FishingForecastAuditFinding> findings,
        FishingHourForecast hour,
        string field,
        double actual,
        double expected)
    {
        if (actual != expected)
            Add(findings, "error", $"hours[{hour.Time}].{field}", $"Valor normalizado divergente. Esperado {expected}, encontrado {actual}.");
    }

    private static void Compare(
        List<FishingForecastAuditFinding> findings,
        FishingHourForecast hour,
        string field,
        string actual,
        string expected)
    {
        if (!string.Equals(actual, expected, StringComparison.Ordinal))
            Add(findings, "error", $"hours[{hour.Time}].{field}", $"Valor normalizado divergente. Esperado {expected}, encontrado {actual}.");
    }

    private static double ValueAt(IReadOnlyList<double?> values, int index)
        => index >= 0 && index < values.Count ? values[index] ?? 0.0 : 0.0;

    private static double? NullableValueAt(IReadOnlyList<double?> values, int index)
        => index >= 0 && index < values.Count ? values[index] : null;

    private static int ToInt(double value)
        => Convert.ToInt32(Math.Round(value, MidpointRounding.ToEven));

    private static double Round(double value, int digits)
        => Math.Round(value, digits, MidpointRounding.ToEven);

    private static string CompassDirection(double degrees)
    {
        string[] names = ["Norte", "Nordeste", "Leste", "Sudeste", "Sul", "Sudoeste", "Oeste", "Noroeste"];
        return names[(int)Math.Floor((degrees + 22.5) / 45) % 8];
    }

    private static void CheckFinite(List<FishingForecastAuditFinding> findings, FishingHourForecast hour)
    {
        CheckFinite(findings, hour, nameof(hour.Score));
        CheckFinite(findings, hour, nameof(hour.WindSpeedKmh));
        CheckFinite(findings, hour, nameof(hour.WindGustKmh));
        CheckFinite(findings, hour, nameof(hour.RainMm));
        CheckFinite(findings, hour, nameof(hour.AirTemperatureC));
        CheckFinite(findings, hour, nameof(hour.WaterTemperatureC));
        CheckFinite(findings, hour, nameof(hour.WaveMeters));
        CheckFinite(findings, hour, nameof(hour.WavePeriodSeconds));
        CheckFinite(findings, hour, nameof(hour.SwellMeters));
        CheckFinite(findings, hour, nameof(hour.SwellPeriodSeconds));
        CheckFinite(findings, hour, nameof(hour.PressureHpa));
    }

    private static void CheckFinite(
        List<FishingForecastAuditFinding> findings,
        FishingHourForecast hour,
        string field)
    {
        var value = field switch
        {
            nameof(hour.Score) => hour.Score,
            nameof(hour.WindSpeedKmh) => hour.WindSpeedKmh,
            nameof(hour.WindGustKmh) => hour.WindGustKmh,
            nameof(hour.RainMm) => hour.RainMm,
            nameof(hour.AirTemperatureC) => hour.AirTemperatureC,
            nameof(hour.WaterTemperatureC) => hour.WaterTemperatureC,
            nameof(hour.WaveMeters) => hour.WaveMeters,
            nameof(hour.WavePeriodSeconds) => hour.WavePeriodSeconds,
            nameof(hour.SwellMeters) => hour.SwellMeters,
            nameof(hour.SwellPeriodSeconds) => hour.SwellPeriodSeconds,
            nameof(hour.PressureHpa) => hour.PressureHpa,
            _ => 0
        };
        if (!double.IsFinite(value))
            Add(findings, "error", $"hours[{hour.Time}].{field}", "Valor não finito.");
    }

    private static void CheckRanges(List<FishingForecastAuditFinding> findings, FishingHourForecast hour)
    {
        if (hour.Score is < 0 or > 10)
            Add(findings, "error", $"hours[{hour.Time}].score", "Nota horária fora do intervalo 0–10.");
        if (hour.WindSpeedKmh < 0 || hour.WindGustKmh < 0 || hour.RainMm < 0 || hour.WaveMeters < 0 || hour.WavePeriodSeconds < 0 || hour.SwellMeters < 0 || hour.SwellPeriodSeconds < 0)
            Add(findings, "error", $"hours[{hour.Time}]", "Medida física negativa.");
        if (hour.RainProbability is < 0 or > 100 || hour.RainProbabilityBestMatch is < 0 or > 100 || hour.RainProbabilityGfs is < 0 or > 100)
            Add(findings, "error", $"hours[{hour.Time}].rainProbability", "Probabilidade de chuva fora do intervalo 0–100.");
        if (hour.WindGustKmh < hour.WindSpeedKmh)
            Add(findings, "warning", $"hours[{hour.Time}].windGustKmh", "Rajada menor que o vento sustentado.");
    }

    private static void Add(
        List<FishingForecastAuditFinding> findings,
        string severity,
        string path,
        string message)
        => findings.Add(new FishingForecastAuditFinding(severity, path, message));
}

internal sealed record FishingForecastAuditReport(
    string SpotId,
    DateOnly Date,
    int HourCount,
    int BestHourCount,
    bool Passed,
    bool RawSourceComparisonAvailable,
    IReadOnlyList<FishingForecastAuditFinding> Findings,
    IReadOnlyList<FishingForecastAuditHour> Hours);

internal sealed record FishingForecastAuditHour(
    string Time,
    bool IsBestHour,
    FishingForecastAuditNormalized Normalized,
    FishingForecastAuditSourcesView? Sources);

internal sealed record FishingForecastAuditNormalized(
    double Score,
    double WindSpeedKmh,
    double WindGustKmh,
    string WindDirection,
    double RainMm,
    int RainProbability,
    int RainProbabilityBestMatch,
    int RainProbabilityGfs,
    double AirTemperatureC,
    double WaterTemperatureC,
    double WaveMeters,
    double WavePeriodSeconds,
    double SwellMeters,
    double SwellPeriodSeconds,
    string WaveDirection,
    string SwellDirection,
    double? SeaLevelHeightMsl,
    double PressureHpa);

internal sealed record FishingForecastAuditSourcesView(
    double CalculatedScore,
    FishingForecastAuditWeather Weather,
    FishingForecastAuditGfsRain GfsRain,
    FishingForecastAuditMarine Marine);

internal sealed record FishingForecastAuditWeather(
    double? WindSpeedKmh,
    double? WindGustKmh,
    double? WindDirectionDegrees,
    double? PrecipitationMm,
    double? RainProbability,
    double? AirTemperatureC,
    double? PressureHpa);

internal sealed record FishingForecastAuditGfsRain(
    double? PrecipitationMm,
    double? RainProbability);

internal sealed record FishingForecastAuditMarine(
    double? WaveMeters,
    double? WaveDirectionDegrees,
    double? WavePeriodSeconds,
    double? SwellMeters,
    double? SwellDirectionDegrees,
    double? SwellPeriodSeconds,
    double? WaterTemperatureC);

internal sealed record FishingForecastAuditSources(
    OpenMeteoResponse Weather,
    OpenMeteoResponse GfsRain,
    OpenMeteoResponse Marine);

internal sealed record FishingForecastAuditFinding(
    string Severity,
    string Path,
    string Message);
