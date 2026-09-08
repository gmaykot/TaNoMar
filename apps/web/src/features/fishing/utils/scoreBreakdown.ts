import type { ForecastHourWindow, WindOrigin } from '../types/fishing';

export function formatScore(score: number) {
  return score.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatScoreBreakdown(windows: ForecastHourWindow[]) {
  if (windows.length === 0) return '';
  const ordered = [...windows].sort((left, right) => left.time.localeCompare(right.time));
  const parts = ordered.map((item) => `${item.time} ${formatScore(item.score)}`);
  if (windows.length === 1) return `Nota da hora · ${parts[0]}`;
  return `Média das ${windows.length} melhores horas · ${parts.join(' · ')}`;
}

export function metricsHourCaption(time: string | null) {
  return time ? `Condições às ${time}` : null;
}

export function windOriginLabel(origin: WindOrigin | null) {
  if (origin === 'terra') return 'Vento de terra';
  if (origin === 'mar') return 'Vento do mar';
  if (origin === 'cruzado') return 'Vento cruzado';
  return null;
}
