import type { ForecastHourWindow, WindOrigin } from '../types/fishing';
import { formatDecimal } from '@/shared/utils/formatNumber';
import { formatHourLabel } from './hours';

export function formatScore(score: number) {
  return formatDecimal(score);
}

export function formatScoreBreakdown(windows: ForecastHourWindow[]) {
  if (windows.length === 0) return '';
  if (windows.length === 1) return 'Nota da melhor hora prevista.';
  return `Nota pela média das ${windows.length} melhores horas.`;
}

export function forecastScoreNote() {
  return 'A nota descreve as condições previstas, não a chance de captura.';
}

export function rankingLeadReason(windowCount: number) {
  const criterion =
    windowCount <= 1
      ? 'Em primeiro pela melhor hora prevista.'
      : `Em primeiro pela média das ${windowCount} melhores horas previstas.`;
  return `${criterion} ${forecastScoreNote()}`;
}

export function metricsHourCaption(time: string | null) {
  return time ? `Condições às ${formatHourLabel(time)}` : null;
}

export function windOriginLabel(origin: WindOrigin | null) {
  if (origin === 'terra') return 'Vento de terra';
  if (origin === 'mar') return 'Vento do mar';
  if (origin === 'cruzado') return 'Vento cruzado';
  return null;
}
