import { describe, expect, it } from 'vitest';
import {
  annualCents,
  billingCycleLabel,
  billingPlanLabel,
  canCancelRenewal,
  canResumePendingCheckout,
  cancelRenewalConfirmMessage,
  checkoutConfirmationCopy,
  checkoutConfirmationFromBilling,
  isBillingUpgrade,
  isCheckoutConfirmed,
  isPartialFirstCharge,
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
  renewsAt: '2027-09-08T12:00:00.000Z',
  accessUntil: '2027-09-08T12:00:00.000Z',
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
    expect(billingPlanLabel('premium')).toBe('Mestre');
    expect(canResumePendingCheckout({ ...activeYearly, status: 'pending' })).toBe(true);
    expect(canResumePendingCheckout(activeYearly)).toBe(false);
    expect(cancelRenewalConfirmMessage('08/09/2027')).toContain('permanece vigente até 08/09/2027');
  });
});

describe('checkout confirmation', () => {
  const paidUser = {
    plan: { code: 'premium', name: 'Mestre' },
    billing: activeYearly,
  };

  it('só confirma quando o plano da conta já bate com a cobrança ativa', () => {
    expect(isCheckoutConfirmed(paidUser, null)).toBe(true);
    expect(isCheckoutConfirmed(paidUser, { planCode: 'premium', cycle: 'YEARLY' })).toBe(true);
    expect(isCheckoutConfirmed(paidUser, { planCode: 'capitao', cycle: 'YEARLY' })).toBe(false);
    expect(
      isCheckoutConfirmed(
        { plan: { code: 'free', name: 'Free' }, billing: { ...activeYearly, status: 'pending' } },
        { planCode: 'premium', cycle: 'YEARLY' },
      ),
    ).toBe(false);
  });

  it('explica o valor integral na renovação quando a primeira cobrança foi a diferença', () => {
    const upgrade = {
      ...activeYearly,
      contractedPrice: 87.19,
      renewalPrice: 191.04,
    };
    expect(isPartialFirstCharge(upgrade)).toBe(true);
    const copy = checkoutConfirmationCopy(checkoutConfirmationFromBilling(upgrade, 'Mestre'));
    expect(copy.title).toBe('Seu plano agora é Mestre.');
    expect(copy.paid).toContain('R$ 87,19');
    expect(copy.paid).toContain('só a diferença desta troca');
    expect(copy.next).toContain('valor integral');
    expect(copy.next).toContain('R$ 191,04');
    expect(copy.next).toContain('08/09/2027');
  });

  it('mostra o valor pago no ciclo quando não houve diferença', () => {
    const copy = checkoutConfirmationCopy(checkoutConfirmationFromBilling(activeYearly, 'Mestre'));
    expect(copy.paid).toBe('Você pagou R$ 191,04 no ciclo anual.');
    expect(copy.next).toBe('A próxima cobrança, em 08/09/2027, será R$ 191,04.');
  });
});
