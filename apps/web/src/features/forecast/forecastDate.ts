export const forecastDateQuery = 'data';

export function readForecastDate(params: URLSearchParams) {
  return params.get(forecastDateQuery)?.trim() ?? '';
}

export function writeForecastDate(params: URLSearchParams, date: string) {
  const value = date.trim();
  if (value) params.set(forecastDateQuery, value);
  else params.delete(forecastDateQuery);
}

export function pathWithForecastDate(pathname: string, date: string) {
  const value = date.trim();
  if (!value) return pathname;
  const params = new URLSearchParams();
  params.set(forecastDateQuery, value);
  return `${pathname}?${params}`;
}

export function resolveForecastDate(requested: string, dates: readonly string[]) {
  if (requested && dates.includes(requested)) return requested;
  return dates[0] ?? '';
}
