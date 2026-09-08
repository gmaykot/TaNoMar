export function formatHourLabel(time: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return time;
  const hour = match[1]!.padStart(2, '0');
  const minutes = match[2];
  return minutes === '00' ? `${hour}h` : `${hour}h${minutes}`;
}

export function formatHourList(hours: string[]) {
  const labels = hours.map(formatHourLabel);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
}

export function splitRecommendationHours(bestHours: string[], metricsHour: string | null) {
  const best =
    metricsHour && bestHours.includes(metricsHour) ? metricsHour : (bestHours[0] ?? null);
  const alternatives = [...bestHours]
    .filter((hour) => hour !== best)
    .sort((left, right) => left.localeCompare(right));
  return { best, alternatives };
}
