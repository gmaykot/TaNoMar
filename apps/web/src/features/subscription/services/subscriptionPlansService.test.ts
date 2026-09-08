import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSubscriptionPlans } from './subscriptionPlansService';

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock('@/shared/api/client', () => ({ apiRequest }));

describe('getSubscriptionPlans', () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequest.mockResolvedValue([
      {
        code: 'free',
        name: 'Free',
        tagline: 'Consulta o mapa TáNoMar.',
        monthlyPriceCents: 0,
        featured: false,
        enabled: true,
        sortOrder: 0,
        entitlements: {
          maxForecastDays: 3,
          maxFavorites: 0,
          maxPersonalSpots: 0,
          maxAlerts: 0,
        },
        modules: {
          marine: false,
          diary: false,
          offline: false,
          customMetrics: false,
          communityVote: false,
          rankingEmphasis: false,
          liveWebcams: false,
        },
      },
    ]);
  });

  it('inclui o Free no catálogo público usado pela landing', async () => {
    await expect(getSubscriptionPlans()).resolves.toMatchObject([{ code: 'free' }]);
    expect(apiRequest).toHaveBeenCalledWith('/plans?includeFree=true');
  });
});
