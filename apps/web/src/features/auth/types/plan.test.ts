import { describe, expect, it } from 'vitest';
import { isPaidPlan, hasPlanModule, SUBSCRIPTION_LOCK_LABEL } from './auth';

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

describe('hasPlanModule', () => {
  it('respeita a flag quando o GET /me já trouxe os módulos', () => {
    const user = {
      plan: { code: 'premium' },
      modules: {
        marine: true,
        diary: false,
        offline: true,
        customMetrics: true,
        communityVote: true,
        rankingEmphasis: true,
      },
    };
    expect(hasPlanModule(user, 'diary')).toBe(false);
    expect(hasPlanModule(user, 'offline')).toBe(true);
  });

  it('cai no plano pago quando os módulos ainda não chegaram', () => {
    expect(hasPlanModule({ plan: { code: 'arrais' } }, 'diary')).toBe(true);
    expect(hasPlanModule({ plan: { code: 'free' } }, 'diary')).toBe(false);
  });
});
