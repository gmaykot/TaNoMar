import type { AuthUser } from '../types/auth';

export const offlineAuthUser: AuthUser = {
  id: 'user-1',
  name: 'Ana',
  email: 'ana@example.com',
  pictureUrl: null,
  role: 'User',
  plan: { code: 'premium', name: 'Mestre' },
  entitlements: {
    maxForecastDays: 8,
    bestHoursMode: '3',
    maxFavorites: 20,
    maxPersonalSpots: 10,
    maxAlerts: 10,
  },
  modules: {
    marine: true,
    diary: true,
    offline: true,
    customMetrics: true,
    customWind: false,
    communityVote: true,
    rankingEmphasis: true,
    liveWebcams: false,
  },
  features: { showPartners: false, showAppFocus: false, showLiveWebcams: false },
  preferences: {
    region: 'Florianópolis',
    windUnit: 'kmh',
    forecastNotifications: true,
    focus: null,
    visibleMetrics: ['wind', 'rain'],
  },
};
