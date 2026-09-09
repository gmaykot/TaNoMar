import { ContractError } from '@/shared/api/errors';
import type {
  AdminAuditFinding,
  AdminAuditHour,
  AdminAuditNormalized,
  AdminAuditReport,
  AdminAuditResult,
  AdminAuditSeverity,
  AdminAuditSources,
  AdminAuditSnapshot,
} from '../types/adminAudit';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== 'string' || value.length === 0)
    throw new ContractError(`${label} inválido.`);
  return value;
}

function requiredNumber(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new ContractError(`${label} inválido.`);
  return value;
}

function optionalNumber(value: unknown, label: string) {
  if (value === null) return null;
  return requiredNumber(value, label);
}

function parseNormalized(value: unknown): AdminAuditNormalized {
  if (!isRecord(value)) throw new ContractError('Dados normalizados da auditoria inválidos.');
  return {
    score: requiredNumber(value.score, 'Nota normalizada'),
    windSpeedKmh: requiredNumber(value.windSpeedKmh, 'Vento normalizado'),
    windGustKmh: requiredNumber(value.windGustKmh, 'Rajada normalizada'),
    windDirection: requiredString(value.windDirection, 'Direção do vento normalizada'),
    rainMm: requiredNumber(value.rainMm, 'Chuva normalizada'),
    rainProbability: requiredNumber(value.rainProbability, 'Probabilidade normalizada'),
    rainProbabilityBestMatch: requiredNumber(
      value.rainProbabilityBestMatch,
      'Probabilidade Weather',
    ),
    rainProbabilityGfs: requiredNumber(value.rainProbabilityGfs, 'Probabilidade GFS'),
    airTemperatureC: requiredNumber(value.airTemperatureC, 'Temperatura do ar normalizada'),
    waterTemperatureC: requiredNumber(value.waterTemperatureC, 'Temperatura da água normalizada'),
    waveMeters: requiredNumber(value.waveMeters, 'Altura da onda normalizada'),
    wavePeriodSeconds: requiredNumber(value.wavePeriodSeconds, 'Período da onda normalizado'),
    swellMeters: requiredNumber(value.swellMeters, 'Altura do swell normalizada'),
    swellPeriodSeconds: requiredNumber(value.swellPeriodSeconds, 'Período do swell normalizado'),
    waveDirection: requiredString(value.waveDirection, 'Direção da onda normalizada'),
    swellDirection: requiredString(value.swellDirection, 'Direção do swell normalizada'),
    seaLevelHeightMsl: optionalNumber(value.seaLevelHeightMsl, 'Nível do mar normalizado'),
    pressureHpa: requiredNumber(value.pressureHpa, 'Pressão normalizada'),
  };
}

function parseWeather(value: unknown) {
  if (!isRecord(value)) throw new ContractError('Dados Weather da auditoria inválidos.');
  return {
    windSpeedKmh: optionalNumber(value.windSpeedKmh, 'Vento Weather'),
    windGustKmh: optionalNumber(value.windGustKmh, 'Rajada Weather'),
    windDirectionDegrees: optionalNumber(value.windDirectionDegrees, 'Direção Weather'),
    precipitationMm: optionalNumber(value.precipitationMm, 'Chuva Weather'),
    rainProbability: optionalNumber(value.rainProbability, 'Probabilidade Weather'),
    airTemperatureC: optionalNumber(value.airTemperatureC, 'Temperatura Weather'),
    pressureHpa: optionalNumber(value.pressureHpa, 'Pressão Weather'),
  };
}

function parseGfsRain(value: unknown) {
  if (!isRecord(value)) throw new ContractError('Dados GFS da auditoria inválidos.');
  return {
    precipitationMm: optionalNumber(value.precipitationMm, 'Chuva GFS'),
    rainProbability: optionalNumber(value.rainProbability, 'Probabilidade GFS'),
  };
}

function parseMarine(value: unknown) {
  if (!isRecord(value)) throw new ContractError('Dados Marine da auditoria inválidos.');
  return {
    waveMeters: optionalNumber(value.waveMeters, 'Ondas Marine'),
    waveDirectionDegrees: optionalNumber(value.waveDirectionDegrees, 'Direção das ondas Marine'),
    wavePeriodSeconds: optionalNumber(value.wavePeriodSeconds, 'Período Marine'),
    swellMeters: optionalNumber(value.swellMeters, 'Swell Marine'),
    swellDirectionDegrees: optionalNumber(value.swellDirectionDegrees, 'Direção do swell Marine'),
    swellPeriodSeconds: optionalNumber(value.swellPeriodSeconds, 'Período do swell Marine'),
    waterTemperatureC: optionalNumber(value.waterTemperatureC, 'Temperatura da água Marine'),
  };
}

function parseSources(value: unknown): AdminAuditSources | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new ContractError('Fontes da auditoria inválidas.');
  return {
    calculatedScore: requiredNumber(value.calculatedScore, 'Nota calculada da fonte'),
    weather: parseWeather(value.weather),
    gfsRain: parseGfsRain(value.gfsRain),
    marine: parseMarine(value.marine),
  };
}

function parseHour(value: unknown): AdminAuditHour {
  if (!isRecord(value) || typeof value.isBestHour !== 'boolean') {
    throw new ContractError('Horário da auditoria inválido.');
  }
  return {
    time: requiredString(value.time, 'Horário da auditoria'),
    isBestHour: value.isBestHour,
    normalized: parseNormalized(value.normalized),
    sources: parseSources(value.sources),
  };
}

function parseFinding(value: unknown): AdminAuditFinding {
  if (!isRecord(value)) throw new ContractError('Achado de auditoria inválido.');
  const severity = requiredString(value.severity, 'Severidade');
  if (severity !== 'error' && severity !== 'warning')
    throw new ContractError('Severidade de auditoria inválida.');
  return {
    severity: severity as AdminAuditSeverity,
    path: requiredString(value.path, 'Caminho do achado'),
    message: requiredString(value.message, 'Mensagem do achado'),
  };
}

function parseReport(value: unknown): AdminAuditReport {
  if (!isRecord(value)) throw new ContractError('Relatório de auditoria inválido.');
  if (
    typeof value.passed !== 'boolean' ||
    typeof value.rawSourceComparisonAvailable !== 'boolean'
  ) {
    throw new ContractError('Status da auditoria inválido.');
  }
  if (!Array.isArray(value.findings) || !Array.isArray(value.hours)) {
    throw new ContractError('Dados da auditoria inválidos.');
  }
  return {
    spotId: requiredString(value.spotId, 'Local da auditoria'),
    date: requiredString(value.date, 'Data da auditoria'),
    hourCount: requiredNumber(value.hourCount, 'Quantidade de horas'),
    bestHourCount: requiredNumber(value.bestHourCount, 'Quantidade de melhores horários'),
    passed: value.passed,
    rawSourceComparisonAvailable: value.rawSourceComparisonAvailable,
    findings: value.findings.map(parseFinding),
    hours: value.hours.map(parseHour),
  };
}

function parseSnapshot(value: unknown): AdminAuditSnapshot | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new ContractError('Snapshot da auditoria inválido.');
  return {
    createdAt: requiredString(value.createdAt, 'Criação do snapshot'),
    expiresAt: requiredString(value.expiresAt, 'Expiração do snapshot'),
    payloadSize: requiredNumber(value.payloadSize, 'Tamanho do snapshot'),
  };
}

export function parseAdminAuditResult(value: unknown): AdminAuditResult {
  if (!isRecord(value) || typeof value.sourceRefresh !== 'boolean') {
    throw new ContractError('Resposta da auditoria inválida.');
  }
  return {
    audit: parseReport(value.audit),
    sourceRefresh: value.sourceRefresh,
    snapshot: parseSnapshot(value.snapshot),
  };
}
