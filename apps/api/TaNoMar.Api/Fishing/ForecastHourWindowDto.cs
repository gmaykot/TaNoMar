using System.Globalization;
using TaNoMar.Api.Data;

namespace TaNoMar.Api.Fishing;

internal static class ForecastHourWindowDto
{
    public static object Create(FishingHourForecast hour, bool paid)
    {
        object Available(object value) => new { state = "available", value };
        object Locked() => new { state = "locked", reason = "plan_required", requiredPlan = PlanRules.RequiredPlanLabel };
        return new
        {
            time = hour.Time,
            score = hour.Score,
            classification = Classification(hour.Score),
            windOrigin = string.IsNullOrEmpty(hour.WindOrigin) ? null : hour.WindOrigin,
            highlights = Highlights(hour),
            wind = Available($"{FormatPt(hour.WindSpeedKmh, "0.#")} km/h {hour.WindDirection}"),
            gusts = Available(FormatMeasure(hour.WindGustKmh, "0.#", "km/h")),
            waves = paid ? Available(FormatMeasure(hour.WaveMeters, "0.00", "m")) : Locked(),
            waveDirection = string.IsNullOrEmpty(hour.WaveDirection) ? null : hour.WaveDirection,
            wavePeriod = paid ? Available(FormatMeasure(hour.WavePeriodSeconds, "0.#", "s")) : Locked(),
            swell = paid ? Available(FormatMeasure(hour.SwellMeters, "0.00", "m")) : Locked(),
            rain = Available($"{FormatPt(hour.RainMm, "0.#")} mm ({hour.RainProbability}%)"),
            airTemperature = Available(FormatMeasure(hour.AirTemperatureC, "0.#", "°C")),
            waterTemperature = paid ? Available(FormatMeasure(hour.WaterTemperatureC, "0.#", "°C")) : Locked(),
            pressure = paid ? Available(FormatMeasure(hour.PressureHpa, "0", "hPa")) : Locked()
        };
    }

    public static string[] Highlights(FishingHourForecast? hour)
    {
        if (hour is null) return [];
        var highlights = new List<string>();
        if (hour.WindOrigin == "terra") highlights.Add("Vento de terra");
        else if (hour.WindOrigin == "mar") highlights.Add("Vento do mar");
        else if (hour.WindOrigin == "cruzado") highlights.Add("Vento cruzado");
        if (hour.WindSpeedKmh <= 15) highlights.Add("Vento leve");
        if (hour.RainProbability <= 20) highlights.Add("Pouca chance de chuva");
        if (hour.WaveMeters <= 1.2) highlights.Add("Ondas moderadas");
        return highlights.Count > 0 ? highlights.Take(3).ToArray() : ["Condições equilibradas"];
    }

    public static string Classification(double score) =>
        score >= 8.5 ? "Excelente" : score >= 7 ? "Muito bom" : score >= 5 ? "Regular" : "Difícil";

    public static string FormatPt(double value, string format) =>
        value.ToString(format, CultureInfo.GetCultureInfo("pt-BR"));

    public static string FormatMeasure(double value, string format, string unit) =>
        $"{FormatPt(value, format)} {unit}";
}
