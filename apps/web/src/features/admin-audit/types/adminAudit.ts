export type AdminAuditSeverity = 'error' | 'warning';

export interface AdminAuditFinding {
  severity: AdminAuditSeverity;
  path: string;
  message: string;
}

export interface AdminAuditReport {
  spotId: string;
  date: string;
  hourCount: number;
  bestHourCount: number;
  passed: boolean;
  rawSourceComparisonAvailable: boolean;
  findings: AdminAuditFinding[];
  hours: AdminAuditHour[];
}

export interface AdminAuditNormalized {
  score: number;
  windSpeedKmh: number;
  windGustKmh: number;
  windDirection: string;
  rainMm: number;
  rainProbability: number;
  rainProbabilityBestMatch: number;
  rainProbabilityGfs: number;
  airTemperatureC: number;
  waterTemperatureC: number;
  waveMeters: number;
  wavePeriodSeconds: number;
  swellMeters: number;
  swellPeriodSeconds: number;
  waveDirection: string;
  swellDirection: string;
  seaLevelHeightMsl: number | null;
  pressureHpa: number;
}

export interface AdminAuditSourceWeather {
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  windDirectionDegrees: number | null;
  precipitationMm: number | null;
  rainProbability: number | null;
  airTemperatureC: number | null;
  pressureHpa: number | null;
}

export interface AdminAuditSourceGfsRain {
  precipitationMm: number | null;
  rainProbability: number | null;
}

export interface AdminAuditSourceMarine {
  waveMeters: number | null;
  waveDirectionDegrees: number | null;
  wavePeriodSeconds: number | null;
  swellMeters: number | null;
  swellDirectionDegrees: number | null;
  swellPeriodSeconds: number | null;
  waterTemperatureC: number | null;
}

export interface AdminAuditSources {
  calculatedScore: number;
  weather: AdminAuditSourceWeather;
  gfsRain: AdminAuditSourceGfsRain;
  marine: AdminAuditSourceMarine;
}

export interface AdminAuditHour {
  time: string;
  isBestHour: boolean;
  normalized: AdminAuditNormalized;
  sources: AdminAuditSources | null;
}

export interface AdminAuditSnapshot {
  createdAt: string;
  expiresAt: string;
  payloadSize: number;
}

export interface AdminAuditResult {
  audit: AdminAuditReport;
  sourceRefresh: boolean;
  snapshot: AdminAuditSnapshot | null;
}

export interface AdminAuditInput {
  spotId: string;
  date: string;
  refreshSources: boolean;
}
