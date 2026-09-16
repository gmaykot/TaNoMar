import { distanceMeters } from '../spotProximity';

const compassPoints = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'] as const;
const compassLabels = [
  'Norte',
  'Nordeste',
  'Leste',
  'Sudeste',
  'Sul',
  'Sudoeste',
  'Oeste',
  'Noroeste',
] as const;

export function hasSpotCoordinates<T extends { latitude: number | null; longitude: number | null }>(
  location: T,
): location is T & { latitude: number; longitude: number } {
  return (
    location.latitude != null &&
    location.longitude != null &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude)
  );
}

export function bearingDegrees(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const fromLat = (latitudeA * Math.PI) / 180;
  const toLat = (latitudeB * Math.PI) / 180;
  const deltaLng = ((longitudeB - longitudeA) * Math.PI) / 180;
  const y = Math.sin(deltaLng) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

export function compassIndex(degrees: number) {
  return Math.round(normalizeDegrees(degrees) / 45) % 8;
}

export function compassPoint(degrees: number) {
  return compassPoints[compassIndex(degrees)];
}

export function compassLabel(degrees: number) {
  return compassLabels[compassIndex(degrees)];
}

export function formatBearing(degrees: number) {
  return `${Math.round(normalizeDegrees(degrees))}°`;
}

export function formatDistance(meters: number) {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  const kilometers = meters / 1000;
  return `${kilometers.toLocaleString('pt-BR', {
    minimumFractionDigits: kilometers < 10 ? 1 : 0,
    maximumFractionDigits: kilometers < 10 ? 1 : 0,
  })} km`;
}

export function headingDelta(fromDegrees: number, toDegrees: number) {
  return ((toDegrees - fromDegrees + 540) % 360) - 180;
}

export function formatLatitude(latitude: number) {
  return `${formatAbsoluteCoordinate(latitude)}° ${latitude >= 0 ? 'N' : 'S'}`;
}

export function formatLongitude(longitude: number) {
  return `${formatAbsoluteCoordinate(longitude)}° ${longitude >= 0 ? 'L' : 'O'}`;
}

export function formatCoordinatePair(latitude: number, longitude: number) {
  return `${formatLatitude(latitude)} · ${formatLongitude(longitude)}`;
}

export function distanceToSpotMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  return distanceMeters(fromLatitude, fromLongitude, toLatitude, toLongitude);
}

function formatAbsoluteCoordinate(value: number) {
  return Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  });
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}
