import type { AppFocus } from '@/features/auth/appFocus';
import type { BillingSubscription } from '@/features/billing/billing';
import type { FishingMetricKey } from '@/features/fishing/types/fishing';
import type { BestHoursMode } from '@/features/subscription/subscriptionPlans';

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
    bestHoursMode?: BestHoursMode;
    maxFavorites: number;
    maxPersonalSpots: number;
    maxAlerts: number;
  };
  modules?: PlanModules;
  features: {
    showPartners: boolean;
    showAppFocus: boolean;
    showLiveWebcams?: boolean;
  };
  preferences: {
    region: string;
    windUnit: string;
    forecastNotifications: boolean;
    focus: AppFocus | null;
    visibleMetrics?: FishingMetricKey[];
  };
  billing?: BillingSubscription;
}

export type AuthStatus = 'booting' | 'anonymous' | 'authenticated';

export type PlanModule =
  | 'marine'
  | 'diary'
  | 'offline'
  | 'customMetrics'
  | 'customWind'
  | 'communityVote'
  | 'rankingEmphasis'
  | 'liveWebcams';

export interface PlanModules {
  marine: boolean;
  diary: boolean;
  offline: boolean;
  customMetrics: boolean;
  customWind?: boolean;
  communityVote: boolean;
  rankingEmphasis: boolean;
  liveWebcams: boolean;
}

export const SUBSCRIPTION_LOCK_LABEL = 'Assinatura';

export function isPaidPlan(user: { plan?: { code?: string } | null } | null | undefined) {
  return Boolean(user?.plan?.code && user.plan.code !== 'free');
}

export function hasPlanModule(
  user: { plan?: { code?: string } | null; modules?: Partial<PlanModules> } | null | undefined,
  module: PlanModule,
) {
  const value = user?.modules?.[module];
  if (typeof value === 'boolean') return value;
  if (module === 'liveWebcams' || module === 'customWind') return false;
  return isPaidPlan(user);
}

export function hasLiveWebcams(
  user:
    | {
        plan?: { code?: string } | null;
        modules?: Partial<PlanModules>;
        features?: { showLiveWebcams?: boolean };
      }
    | null
    | undefined,
) {
  return hasPlanModule(user, 'liveWebcams') && showsLiveWebcams(user);
}

export function isAdmin(user: Pick<AuthUser, 'role'> | null | undefined) {
  return user?.role === 'Admin';
}

export function showsPartners(user: Pick<AuthUser, 'features'> | null | undefined) {
  return user?.features.showPartners === true;
}

export function showsAppFocus(user: Pick<AuthUser, 'features'> | null | undefined) {
  return user?.features.showAppFocus === true;
}

export function showsLiveWebcams(
  user: { features?: { showLiveWebcams?: boolean } } | null | undefined,
) {
  return user?.features?.showLiveWebcams !== false;
}
