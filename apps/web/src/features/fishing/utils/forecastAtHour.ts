import type { ForecastRankingItem } from '../types/fishing';

export function forecastAtHour(
  forecast: ForecastRankingItem,
  hour: string | null | undefined,
): ForecastRankingItem {
  if (!hour) return forecast;
  const window = forecast.hourWindows.find((item) => item.time === hour);
  if (!window) return { ...forecast, metricsHour: hour };
  if (!window.metrics?.length) return { ...forecast, metricsHour: hour };
  return {
    ...forecast,
    metricsHour: window.time,
    windOrigin: window.windOrigin ?? forecast.windOrigin,
    highlights: window.highlights ?? forecast.highlights,
    metrics: window.metrics,
    pressure: window.pressure ?? forecast.pressure,
  };
}
