export interface AuthUser {
  id: string;
  name: string;
  email: string;
  pictureUrl: string | null;
  role: string;
  plan: {
    code: string;
    name: string;
  };
  entitlements: {
    maxForecastDays: number;
    maxFavorites: number;
    maxPersonalSpots: number;
    maxAlerts: number;
  };
  preferences: {
    region: string;
    windUnit: string;
    forecastNotifications: boolean;
  };
}

export type AuthStatus = 'booting' | 'anonymous' | 'authenticated';

export function isAdmin(user: Pick<AuthUser, 'role'> | null | undefined) {
  return user?.role === 'Admin';
}
