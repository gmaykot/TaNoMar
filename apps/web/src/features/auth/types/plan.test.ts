import { describe, expect, it } from 'vitest';
import { isPaidPlan, SUBSCRIPTION_LOCK_LABEL } from './auth';

describe('isPaidPlan', () => {
  it('reconhece Arrais, Mestre e Capitão como assinatura', () => {
    expect(isPaidPlan({ plan: { code: 'arrais' } })).toBe(true);
    expect(isPaidPlan({ plan: { code: 'premium' } })).toBe(true);
    expect(isPaidPlan({ plan: { code: 'capitao' } })).toBe(true);
  });

  it('mantém o plano gratuito fora da assinatura', () => {
    expect(isPaidPlan({ plan: { code: 'free' } })).toBe(false);
    expect(isPaidPlan(null)).toBe(false);
    expect(isPaidPlan({ plan: { code: '' } })).toBe(false);
  });

  it('usa Assinatura como rótulo de recurso bloqueado', () => {
    expect(SUBSCRIPTION_LOCK_LABEL).toBe('Assinatura');
  });
});
