import { ContractError } from '@/shared/api/errors';
import type {
  WireForecastDay,
  WireForecastItem,
  WireLocationForecast,
  WireMarineDetails,
  WireMarinePoint,
  WireMarineSeries,
  WireRankingForecast,
  WireSpot,
  WireTideValue,
} from '../types/wire';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function parseMetric<T>(value: unknown, readValue: (input: unknown) => T | null, label: string) {
  if (!isRecord(value) || (value.state !== 'available' && value.state !== 'locked')) {
    throw new ContractError(`Métrica ${label} inválida.`);
  }
  if (value.state === 'locked') {
    return {
      state: 'locked' as const,
      reason: readString(value.reason) ?? 'plan_required',
      requiredPlan: readString(value.requiredPlan) ?? 'Premium',
    };
  }
  const parsed = readValue(value.value);
  if (parsed === null) throw new ContractError(`Métrica ${label} sem valor.`);
  return { state: 'available' as const, value: parsed };
}

function parseStringList(value: unknown) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return null;
  return value as string[];
}

function parseForecastItem(value: unknown): WireForecastItem {
  if (!isRecord(value)) throw new ContractError('Item de ranking inválido.');
  const spotId = readString(value.spotId);
  const spotName = readString(value.spotName);
  if (!spotId || !spotName) throw new ContractError('Item de ranking sem local.');
  return {
    spotId,
    spotName,
    score: parseMetric(value.score, readNumber, 'score'),
    classification: parseMetric(value.classification, readString, 'classification'),
    bestHours: parseMetric(value.bestHours, parseStringList, 'bestHours'),
    wind: parseMetric(value.wind, readString, 'wind'),
    gusts: parseMetric(value.gusts, readString, 'gusts'),
    waves: parseMetric(value.waves, readString, 'waves'),
    wavePeriod: parseMetric(value.wavePeriod, readString, 'wavePeriod'),
    swell: parseMetric(value.swell, readString, 'swell'),
    rain: parseMetric(value.rain, readString, 'rain'),
    airTemperature: parseMetric(value.airTemperature, readString, 'airTemperature'),
    waterTemperature: parseMetric(value.waterTemperature, readString, 'waterTemperature'),
  };
}

export function parseForecastDay(value: unknown): WireForecastDay {
  if (!isRecord(value)) throw new ContractError('Dia de previsão inválido.');
  const date = readString(value.date);
  if (!date || !Array.isArray(value.ranking))
    throw new ContractError('Dia de previsão incompleto.');
  const unavailableSpotIds = Array.isArray(value.unavailableSpotIds)
    ? value.unavailableSpotIds.filter((item): item is string => typeof item === 'string')
    : [];
  return {
    date,
    ranking: value.ranking.map(parseForecastItem),
    unavailableSpotIds,
  };
}

export function parseRankingForecast(value: unknown): WireRankingForecast {
  if (!isRecord(value)) throw new ContractError('Ranking inválido.');
  const generatedAt = readString(value.generatedAt);
  const availableFrom = readString(value.availableFrom);
  const availableTo = readString(value.availableTo);
  if (!generatedAt || !availableFrom || !availableTo || !Array.isArray(value.days)) {
    throw new ContractError('Ranking incompleto.');
  }
  return {
    generatedAt,
    availableFrom,
    availableTo,
    days: value.days.map(parseForecastDay),
  };
}

export function parseLocationForecast(value: unknown): WireLocationForecast {
  if (!isRecord(value)) throw new ContractError('Previsão do local inválida.');
  const spotId = readString(value.spotId);
  if (!spotId || !Array.isArray(value.days))
    throw new ContractError('Previsão do local incompleta.');
  return {
    spotId,
    days: value.days.map(parseForecastDay),
  };
}

export function parseSpot(value: unknown): WireSpot {
  if (!isRecord(value)) throw new ContractError('Local inválido.');
  const id = readString(value.id);
  const name = readString(value.name);
  const slug = readString(value.slug) ?? id;
  const city = readString(value.city);
  const state = readString(value.state);
  const region = readString(value.region);
  const type = readString(value.type) ?? 'praia';
  const visibility = readString(value.visibility) ?? 'official';
  const profile = readString(value.profile) ?? 'praia_aberta';
  if (!id || !name || !slug || city === null || state === null || region === null) {
    throw new ContractError('Local incompleto.');
  }
  const latitude = value.latitude === null ? null : readNumber(value.latitude);
  const longitude = value.longitude === null ? null : readNumber(value.longitude);
  if (value.latitude !== null && value.latitude !== undefined && latitude === null) {
    throw new ContractError('Latitude inválida.');
  }
  if (value.longitude !== null && value.longitude !== undefined && longitude === null) {
    throw new ContractError('Longitude inválida.');
  }
  return {
    id,
    name,
    slug,
    description: readString(value.description),
    city,
    state,
    region,
    type,
    visibility,
    profile,
    latitude,
    longitude,
    seaOrientationDegrees: readNumber(value.seaOrientationDegrees) ?? 0,
    isFavorite: readBoolean(value.isFavorite) ?? false,
    isInRanking: readBoolean(value.isInRanking) ?? false,
    isApproved: readBoolean(value.isApproved) ?? visibility !== 'shared',
    isOwner: readBoolean(value.isOwner) ?? false,
  };
}

export function parseSpotList(value: unknown) {
  if (!Array.isArray(value)) throw new ContractError('Lista de locais inválida.');
  return value.map(parseSpot);
}

function parseMarinePoint(value: unknown): WireMarinePoint | null {
  if (!isRecord(value)) return null;
  const time = readString(value.time);
  const pointValue = readNumber(value.value);
  if (!time || pointValue === null) return null;
  return { time, value: pointValue };
}

function parseMarineSeriesValue(value: unknown): WireMarineSeries | null {
  if (!isRecord(value)) return null;
  const current = readString(value.current);
  const range = readString(value.range);
  if (!current || !range || !Array.isArray(value.points)) return null;
  const points = value.points.map(parseMarinePoint);
  if (points.some((point) => point === null)) return null;
  return {
    current,
    range,
    direction: readString(value.direction),
    detail: readString(value.detail),
    points: points as WireMarinePoint[],
  };
}

function parseTideValue(value: unknown): WireTideValue | null {
  if (!isRecord(value) || !Array.isArray(value.extremes) || !Array.isArray(value.points))
    return null;
  const current = readString(value.current);
  const phase = readString(value.phase);
  const nextExtreme = readString(value.nextExtreme);
  if (!current || !phase || !nextExtreme) return null;
  const attribution = readString(value.attribution);
  const extremes = value.extremes.map((item) => {
    if (!isRecord(item)) return null;
    const type = readString(item.type);
    const time = readString(item.time);
    const height = readString(item.height);
    if (!type || !time || !height) return null;
    return { type, time, height };
  });
  const points = value.points.map(parseMarinePoint);
  if (extremes.some((item) => item === null) || points.some((item) => item === null)) return null;
  return {
    current,
    phase,
    nextExtreme,
    attribution,
    extremes: extremes as WireTideValue['extremes'],
    points: points as WireMarinePoint[],
  };
}

function parseOptionalMetric<T>(
  value: unknown,
  readValue: (input: unknown) => T | null,
  label: string,
) {
  if (isRecord(value) && value.state === 'unavailable') return { state: 'unavailable' as const };
  return parseMetric(value, readValue, label);
}

export function parseMarineDetails(value: unknown): WireMarineDetails {
  if (!isRecord(value)) throw new ContractError('Detalhe do mar inválido.');
  const spotId = readString(value.spotId);
  const date = readString(value.date);
  if (!spotId || !date) throw new ContractError('Detalhe do mar incompleto.');
  return {
    spotId,
    date,
    waves: parseMetric(value.waves, parseMarineSeriesValue, 'waves'),
    wavePeriod: parseMetric(value.wavePeriod, parseMarineSeriesValue, 'wavePeriod'),
    swell: parseMetric(value.swell, parseMarineSeriesValue, 'swell'),
    waterTemperature: parseMetric(
      value.waterTemperature,
      parseMarineSeriesValue,
      'waterTemperature',
    ),
    atmosphericPressure: parseMetric(
      value.atmosphericPressure,
      parseMarineSeriesValue,
      'atmosphericPressure',
    ),
    tide: parseOptionalMetric(value.tide, parseTideValue, 'tide'),
  };
}
