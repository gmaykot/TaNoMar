import type { ForecastRankingItem } from '../types/fishing';

export function forecastAtHour(
  forecast: ForecastRankingItem,
  hour: string | null | undefined,
): ForecastRankingItem {
  if (!hour) return forecast;
  const window = forecast.hourWindows.find((item) => item.time === hour);
  if (!window) return { ...forecast, metricsHour: hour };
  return {
    ...forecast,
    metricsHour: window.time,
    score: window.score,
    classification: window.classification ?? forecast.classification,
    windOrigin: window.windOrigin ?? forecast.windOrigin,
    highlights: window.highlights ?? forecast.highlights,
    metrics: window.metrics?.length ? window.metrics : forecast.metrics,
    pressure: window.pressure ?? forecast.pressure,
  };
}
