import { describe, expect, it } from 'vitest';
import { isPaidPlan, hasPlanModule, hasLiveWebcams, SUBSCRIPTION_LOCK_LABEL } from './auth';

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
    expect(hasPlanModule(user, 'liveWebcams')).toBe(false);
  });

  it('cai no plano pago quando os módulos ainda não chegaram', () => {
    expect(hasPlanModule({ plan: { code: 'arrais' } }, 'diary')).toBe(true);
    expect(hasPlanModule({ plan: { code: 'free' } }, 'diary')).toBe(false);
  });

  it('não trata Câmeras ao vivo como módulo de qualquer plano pago', () => {
    expect(hasPlanModule({ plan: { code: 'capitao' } }, 'liveWebcams')).toBe(false);
    expect(
      hasPlanModule(
        {
          plan: { code: 'capitao' },
          modules: {
            marine: true,
            diary: true,
            offline: true,
            customMetrics: true,
            communityVote: true,
            rankingEmphasis: true,
            liveWebcams: true,
          },
        },
        'liveWebcams',
      ),
    ).toBe(true);
  });
});

describe('hasLiveWebcams', () => {
  const capitao = {
    plan: { code: 'capitao' },
    modules: { liveWebcams: true },
  };

  it('respeita o interruptor do admin', () => {
    expect(hasLiveWebcams({ ...capitao, features: { showLiveWebcams: true } })).toBe(true);
    expect(hasLiveWebcams({ ...capitao, features: { showLiveWebcams: false } })).toBe(false);
  });
});
