import { describe, expect, it } from 'vitest';
import {
  annualCents,
  billingCycleLabel,
  canCancelRenewal,
  cancelRenewalConfirmMessage,
  isBillingUpgrade,
  type BillingSubscription,
} from './billing';

const activeYearly: BillingSubscription = {
  status: 'active',
  planCode: 'premium',
  cycle: 'YEARLY',
  catalogMonthlyPrice: 19.9,
  catalogAnnualPrice: 191.04,
  contractedPrice: 191.04,
  renewalPrice: 191.04,
  discountPercent: 20,
  renewsAt: '2027-09-08T00:00:00.000Z',
  accessUntil: '2027-09-08T00:00:00.000Z',
  cancelAtPeriodEnd: false,
  enabled: true,
};

describe('annualCents', () => {
  it('aplica 20% sobre 12 meses da tabela', () => {
    expect(annualCents(1490)).toBe(14304);
    expect(annualCents(1990)).toBe(19104);
    expect(annualCents(2490)).toBe(23904);
  });
});

describe('isBillingUpgrade', () => {
  it('trata tabela maior e mensal para anual como upgrade', () => {
    expect(isBillingUpgrade('arrais', 'YEARLY', 'premium', 'YEARLY')).toBe(true);
    expect(isBillingUpgrade('premium', 'MONTHLY', 'premium', 'YEARLY')).toBe(true);
    expect(isBillingUpgrade('premium', 'YEARLY', 'premium', 'MONTHLY')).toBe(false);
    expect(isBillingUpgrade('capitao', 'YEARLY', 'arrais', 'YEARLY')).toBe(false);
  });
});

describe('canCancelRenewal', () => {
  it('permite cancelar só com recorrência ativa ou atrasada', () => {
    expect(canCancelRenewal(activeYearly)).toBe(true);
    expect(canCancelRenewal({ ...activeYearly, status: 'past_due' })).toBe(true);
    expect(canCancelRenewal({ ...activeYearly, cancelAtPeriodEnd: true, status: 'canceled' })).toBe(
      false,
    );
    expect(canCancelRenewal({ ...activeYearly, enabled: false })).toBe(false);
    expect(billingCycleLabel('YEARLY')).toBe('anual');
    expect(cancelRenewalConfirmMessage('08/09/2027')).toContain('volta para Free');
  });
});
