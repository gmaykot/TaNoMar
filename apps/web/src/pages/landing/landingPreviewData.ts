import type {
  FishingClassification,
  FishingMetric,
  ForecastDay,
  ForecastRankingItem,
} from '@/features/fishing/types/fishing';

interface PreviewSpot {
  id: string;
  name: string;
  score: number;
  classification: FishingClassification;
  hour: string;
  wind: string;
  windDetail: string;
  waves: string;
  rain: string;
}

const spots: PreviewSpot[] = [
  {
    id: 'landing-pantano-do-sul',
    name: 'Pântano do Sul',
    score: 9.1,
    classification: 'excellent',
    hour: '05:30',
    wind: '7 km/h',
    windDetail: 'Leste',
    waves: '0,7 m',
    rain: '0 mm',
  },
  {
    id: 'landing-joaquina',
    name: 'Joaquina',
    score: 8.4,
    classification: 'very-good',
    hour: '06:00',
    wind: '12 km/h',
    windDetail: 'Nordeste',
    waves: '1,1 m',
    rain: '0 mm',
  },
  {
    id: 'landing-armacao',
    name: 'Armação',
    score: 7.6,
    classification: 'very-good',
    hour: '06:30',
    wind: '9 km/h',
    windDetail: 'Leste',
    waves: '0,8 m',
    rain: '0,2 mm',
  },
  {
    id: 'landing-campeche',
    name: 'Campeche',
    score: 6.2,
    classification: 'regular',
    hour: '16:30',
    wind: '18 km/h',
    windDetail: 'Sul',
    waves: '1,4 m',
    rain: '1 mm',
  },
];

function metrics(spot: PreviewSpot, index: number): FishingMetric[] {
  return [
    { key: 'wind', label: 'Vento', value: spot.wind, detail: spot.windDetail },
    { key: 'gusts', label: 'Rajadas', value: `${14 + index * 2} km/h` },
    { key: 'waves', label: 'Ondas', value: spot.waves },
    { key: 'wave-period', label: 'Período', value: `${7 + (index % 4)} s` },
    { key: 'rain', label: 'Chuva', value: spot.rain },
  ];
}

function rankingItem(spot: PreviewSpot, index: number): ForecastRankingItem {
  const hourWindows = [spot.hour, '07:00', '17:00'].map((time, hourIndex) => ({
    time,
    score: Math.round((spot.score - hourIndex * 0.2) * 10) / 10,
    classification: spot.classification,
  }));

  return {
    locationId: spot.id,
    locationName: spot.name,
    score: spot.score,
    classification: spot.classification,
    bestWindow: `${spot.hour}–08:00`,
    bestHours: [spot.hour, '07:00', '17:00'],
    hourWindows,
    scoreBreakdown: 'Demonstração ilustrativa',
    metricsHour: spot.hour,
    windOrigin: index % 2 ? 'mar' : 'terra',
    metrics: metrics(spot, index),
    isOwner: false,
    isFavorite: false,
    visibility: 'official',
  };
}

export const landingPreviewRanking: ForecastRankingItem[] = spots.map(rankingItem);

export const landingPreviewDays: ForecastDay[] = [
  {
    date: '2026-09-10',
    label: 'Hoje',
    shortLabel: 'qui, 10',
    ranking: landingPreviewRanking,
  },
  {
    date: '2026-09-11',
    label: 'Amanhã',
    shortLabel: 'sex, 11',
    ranking: landingPreviewRanking,
  },
  {
    date: '2026-09-12',
    label: 'Sábado',
    shortLabel: 'sáb, 12',
    ranking: landingPreviewRanking,
  },
];

export const landingPreviewDate = landingPreviewDays[0]!.date;
export const landingPreviewDayLabel = landingPreviewDays[0]!.label;
