import { describe, expect, it } from 'vitest';
import { annualCents, isBillingUpgrade } from './billing';

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
