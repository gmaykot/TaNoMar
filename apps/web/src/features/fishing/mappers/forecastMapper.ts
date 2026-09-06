import type {
  FishingClassification,
  FishingForecast,
  FishingLocation,
  FishingMetric,
  ForecastDay,
  ForecastRankingItem,
  LocationForecast,
  MarineDetails,
  MarineSeries,
  MarineTide,
} from '../types/fishing';
import type {
  WireForecastDay,
  WireForecastItem,
  WireLocationForecast,
  WireMarineDetails,
  WireMarineSeries,
  WireMetric,
  WireOptionalMetric,
  WireRankingForecast,
  WireSpot,
  WireTideValue,
} from '../types/wire';
import { ContractError } from '@/shared/api/errors';

const TIME_ZONE = 'America/Sao_Paulo';

const classificationByLabel: Record<string, FishingClassification> = {
  Excelente: 'excellent',
  'Muito bom': 'very-good',
  Regular: 'regular',
  Difícil: 'difficult',
};

const locationProfiles = ['praia_aberta', 'praia_semi_aberta', 'praia_protegida'] as const;

function parseCalendarDate(date: string) {
  return new Date(`${date}T12:00:00-03:00`);
}

function calendarDate(now: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now);
}

function addCalendarDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, day! + days));
  return next.toISOString().slice(0, 10);
}

function capitalize(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function dayLabels(date: string, today: string) {
  const tomorrow = addCalendarDays(today, 1);
  const shortWeekday = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    timeZone: TIME_ZONE,
  })
    .format(parseCalendarDate(date))
    .replace('.', '');
  const dayNumber = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    timeZone: TIME_ZONE,
  }).format(parseCalendarDate(date));
  const shortLabel = `${capitalize(shortWeekday.trim())} ${dayNumber}`;

  if (date === today) return { label: 'Hoje', shortLabel };
  if (date === tomorrow) return { label: 'Amanhã', shortLabel };

  const weekday = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    timeZone: TIME_ZONE,
  }).format(parseCalendarDate(date));
  return { label: capitalize(weekday.split('-')[0] ?? weekday), shortLabel };
}

function mapClassification(value: string): FishingClassification {
  const classification = classificationByLabel[value];
  if (!classification) throw new ContractError(`Classificação desconhecida: ${value}.`);
  return classification;
}

function mapBestWindow(hours: string[]) {
  if (hours.length === 0) return '—';
  if (hours.length === 1) return hours[0]!;
  return `${hours[0]}–${hours[hours.length - 1]}`;
}

function mapMetric(
  key: FishingMetric['key'],
  label: string,
  metric: WireMetric<string>,
  detail?: string,
): FishingMetric {
  if (metric.state === 'locked') {
    return {
      key,
      label,
      value: 'Premium',
      detail: metric.requiredPlan,
      locked: true,
    };
  }
  return { key, label, value: metric.value, detail };
}

function requireAvailable<T>(metric: WireMetric<T>, label: string) {
  if (metric.state !== 'available') throw new ContractError(`${label} veio bloqueado.`);
  return metric.value;
}

export function mapForecastItem(item: WireForecastItem): ForecastRankingItem {
  const hours = requireAvailable(item.bestHours, 'Horários');
  return {
    locationId: item.spotId,
    locationName: item.spotName,
    score: requireAvailable(item.score, 'Nota'),
    classification: mapClassification(requireAvailable(item.classification, 'Classificação')),
    bestWindow: mapBestWindow(hours),
    bestHours: hours,
    metrics: [
      mapMetric('wind', 'Vento', item.wind),
      mapMetric('gusts', 'Rajadas', item.gusts),
      mapMetric('waves', 'Ondas', item.waves),
      mapMetric('wave-period', 'Período', item.wavePeriod),
      mapMetric('swell', 'Swell', item.swell),
      mapMetric('rain', 'Chuva', item.rain),
      mapMetric('air-temperature', 'Temperatura', item.airTemperature, 'Ar'),
      mapMetric('water-temperature', 'Água', item.waterTemperature),
    ],
  };
}

export function mapForecastDay(day: WireForecastDay, now = new Date()): ForecastDay {
  const labels = dayLabels(day.date, calendarDate(now));
  return {
    date: day.date,
    label: labels.label,
    shortLabel: labels.shortLabel,
    ranking: day.ranking.map(mapForecastItem),
  };
}

export function mapForecast(wire: WireRankingForecast, now = new Date()): FishingForecast {
  return {
    generatedAt: wire.generatedAt,
    days: wire.days.map((day) => mapForecastDay(day, now)),
  };
}

export function mapLocation(spot: WireSpot): FishingLocation {
  const profile = locationProfiles.includes(spot.profile as (typeof locationProfiles)[number])
    ? (spot.profile as FishingLocation['profile'])
    : 'praia_aberta';
  return {
    id: spot.id,
    name: spot.name,
    city: spot.city,
    state: spot.state,
    region: spot.region,
    description: spot.description,
    type: spot.type,
    visibility:
      spot.visibility === 'shared' || spot.visibility === 'private' ? spot.visibility : 'official',
    profile,
    latitude: spot.latitude ?? 0,
    longitude: spot.longitude ?? 0,
    seaOrientationDegrees: spot.seaOrientationDegrees,
    isFavorite: spot.isFavorite,
    isEnabled: spot.isEnabled,
    isInRanking: spot.isInRanking,
    isApproved: spot.isApproved,
    isOwner: spot.isOwner,
  };
}

function mapMarineSeries(
  key: MarineSeries['key'],
  label: string,
  metric: WireMetric<WireMarineSeries>,
): MarineSeries {
  if (metric.state === 'locked') {
    return { key, label, current: 'Premium', range: 'Premium', points: [], locked: true };
  }
  return {
    key,
    label,
    current: metric.value.current,
    range: metric.value.range,
    direction: metric.value.direction ?? undefined,
    detail: metric.value.detail ?? undefined,
    points: metric.value.points,
  };
}

function mapTide(metric: WireOptionalMetric<WireTideValue>): MarineTide {
  if (metric.state === 'locked') {
    return {
      current: 'Premium',
      phase: 'Premium',
      nextExtreme: 'Premium',
      extremes: [],
      points: [],
      locked: true,
    };
  }
  if (metric.state === 'unavailable') {
    return {
      current: 'Indisponível',
      phase: '—',
      nextExtreme: 'Maré temporariamente indisponível.',
      extremes: [],
      points: [],
      unavailable: true,
    };
  }
  return {
    current: metric.value.current,
    phase: metric.value.phase,
    nextExtreme: metric.value.nextExtreme,
    attribution: metric.value.attribution ?? undefined,
    extremes: metric.value.extremes.map((item) => ({
      type: item.type === 'preamar' ? 'preamar' : 'baixa-mar',
      time: item.time,
      height: item.height,
    })),
    points: metric.value.points,
  };
}

export function mapMarineDetails(wire: WireMarineDetails): MarineDetails {
  return {
    spotId: wire.spotId,
    date: wire.date,
    series: [
      mapMarineSeries('waves', 'Ondas', wire.waves),
      mapMarineSeries('wave-period', 'Período', wire.wavePeriod),
      mapMarineSeries('swell', 'Swell', wire.swell),
      mapMarineSeries('water-temperature', 'Água', wire.waterTemperature),
      mapMarineSeries('atmospheric-pressure', 'Pressão', wire.atmosphericPressure),
    ],
    tide: mapTide(wire.tide),
  };
}

export function mapLocationForecast(
  location: FishingLocation,
  wire: WireLocationForecast,
  now = new Date(),
): LocationForecast {
  return {
    location,
    days: wire.days.flatMap((day) => {
      const mapped = mapForecastDay(day, now);
      const forecast = mapped.ranking[0];
      if (!forecast) return [];
      return [
        {
          date: mapped.date,
          label: mapped.label,
          shortLabel: mapped.shortLabel,
          forecast,
        },
      ];
    }),
  };
}
