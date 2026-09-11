import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { parseAdminDashboard } from './adminDashboardMapper';

export const dashboardSample = {
  generatedAt: '2026-09-10T22:00:00+00:00',
  users: {
    total: 12,
    active: 10,
    blocked: 2,
    admins: 1,
    paid: 4,
    newLast7Days: 2,
    newLast30Days: 5,
    byPlan: [
      { code: 'free', name: 'Free', count: 8 },
      { code: 'arrais', name: 'Arrais', count: 2 },
      { code: 'premium', name: 'Mestre', count: 1 },
      { code: 'capitao', name: 'Capitão', count: 1 },
    ],
  },
  spots: {
    official: 20,
    officialEnabled: 18,
    officialDisabled: 2,
    officialFreeDefault: 12,
    officialWithoutCoordinates: 1,
    officialWithWebcam: 3,
    personal: 6,
    sharedApproved: 4,
    sharedPending: 2,
    byRegion: [
      { code: 'norte', name: 'norte', count: 5 },
      { code: 'sul', name: 'sul', count: 7 },
    ],
  },
  billing: {
    active: 4,
    cancelAtPeriodEnd: 1,
    pastDue: 1,
    pendingCheckout: 2,
    canceledWithAccess: 0,
    monthlyCount: 3,
    yearlyCount: 1,
    monthlyRecurringCents: 5470,
  },
  engagement: {
    activeAlerts: 8,
    pushDevices: 5,
    favorites: 14,
    enabledSpots: 30,
    activeReports: 3,
    reportsLast7Days: 6,
    reportsLast30Days: 11,
  },
  partners: {
    published: 2,
    unpublished: 1,
    featured: 1,
  },
};

describe('parseAdminDashboard', () => {
  it('aceita o contrato do painel', () => {
    expect(parseAdminDashboard(dashboardSample)).toMatchObject({
      users: { active: 10, paid: 4 },
      spots: { sharedPending: 2, officialWithWebcam: 3 },
      billing: { monthlyRecurringCents: 5470 },
    });
  });

  it('rejeita payload incompleto', () => {
    expect(() => parseAdminDashboard({ ...dashboardSample, generatedAt: '' })).toThrow(ContractError);
  });

  it('rejeita contagem negativa', () => {
    expect(() =>
      parseAdminDashboard({
        ...dashboardSample,
        users: { ...dashboardSample.users, total: -1 },
      }),
    ).toThrow(ContractError);
  });
});
