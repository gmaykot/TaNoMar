import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { parseBillingCatalog, parseBillingCheckout } from './billingMapper';

const sample = {
  enabled: true,
  discountPercent: 20,
  plans: [
    {
      code: 'premium',
      name: 'Mestre',
      tagline: 'O equilíbrio para planejar a semana.',
      monthlyPriceCents: 1990,
      annualPriceCents: 19104,
      featured: true,
      enabled: true,
      sortOrder: 2,
      entitlements: {
        maxForecastDays: 8,
        maxFavorites: 20,
        maxPersonalSpots: 10,
        maxAlerts: 10,
      },
      modules: {
        marine: true,
        diary: true,
        offline: true,
        customMetrics: true,
        communityVote: true,
        rankingEmphasis: true,
      },
      quotes: [
        {
          kind: 'upgrade',
          cycle: 'YEARLY',
          remainingDays: 265,
          creditCents: 10385,
          firstChargeCents: 8719,
          renewalPriceCents: 19104,
        },
      ],
    },
  ],
};

describe('parseBillingCatalog', () => {
  it('aceita o contrato do catálogo de cobrança', () => {
    expect(parseBillingCatalog(sample)).toMatchObject({
      enabled: true,
      discountPercent: 20,
      plans: [
        {
          code: 'premium',
          annualPriceCents: 19104,
          quotes: [{ firstChargeCents: 8719, cycle: 'YEARLY' }],
        },
      ],
    });
  });

  it('rejeita catálogo incompleto', () => {
    expect(() => parseBillingCatalog({ ...sample, enabled: 'yes' })).toThrow(ContractError);
  });
});

describe('parseBillingCheckout', () => {
  it('aceita o retorno do checkout', () => {
    expect(
      parseBillingCheckout({
        checkoutId: 'chk_1',
        checkoutUrl: 'https://asaas.com/checkoutSession/show?id=chk_1',
        expiresAt: '2026-09-08T12:00:00Z',
      }),
    ).toEqual({
      checkoutId: 'chk_1',
      checkoutUrl: 'https://asaas.com/checkoutSession/show?id=chk_1',
      expiresAt: '2026-09-08T12:00:00Z',
    });
  });
});
