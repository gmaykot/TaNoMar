import type {
  ForecastConfidenceLevel,
  ForecastConfidenceReason,
  ForecastQuality,
} from '@/features/fishing/types/fishing';

const confidenceAdjectives: Record<ForecastConfidenceLevel, string> = {
  high: 'alta',
  medium: 'média',
  low: 'baixa',
};

const reasonMessages: Record<ForecastConfidenceReason, string> = {
  limited_hour_coverage: 'Parte dos horários está sem dados completos.',
  sparse_hour_coverage: 'Poucos horários possuem dados completos.',
  snapshot_refresh_due: 'Os dados estão aguardando atualização.',
  stale_snapshot: 'A previsão está usando dados mais antigos que o normal.',
};

export function forecastConfidenceLabel(
  level: ForecastConfidenceLevel,
  source: 'live' | 'offline' = 'live',
) {
  const adjective = confidenceAdjectives[level];
  if (source === 'offline') {
    return `Confiança na última atualização: ${adjective.charAt(0).toUpperCase()}${adjective.slice(1)}`;
  }
  return `Confiança ${adjective}`;
}

export function forecastCompletenessCopy(quality: ForecastQuality) {
  const { validHours, expectedHours } = quality.dataCompleteness;
  return `${validHours} de ${expectedHours} horários com dados completos`;
}

export function forecastConfidenceReasonMessages(quality: ForecastQuality) {
  return quality.confidence.reasons.map((reason) => reasonMessages[reason]);
}

export function formatForecastDataAge(dataUpdatedAt: string, now = new Date()) {
  const updatedAt = Date.parse(dataUpdatedAt);
  if (Number.isNaN(updatedAt)) return null;
  const elapsedMs = Math.max(0, now.getTime() - updatedAt);
  const hours = Math.floor(elapsedMs / 3_600_000);
  if (hours < 1) return 'Dados atualizados há menos de 1 hora';
  if (hours < 24) return `Dados atualizados há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.floor(hours / 24);
  return `Dados atualizados há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}
