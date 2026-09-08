import { describe, expect, it } from 'vitest';
import {
  effectiveFocus,
  hasChosenAppFocus,
  homeCopy,
  locationPrimaryMetricKeys,
  resolveVisibleMetricKeys,
  showsCommunity,
  showsFishingScore,
} from './appFocus';

describe('appFocus', () => {
  it('trata ausência de foco como visão completa', () => {
    expect(hasChosenAppFocus(null)).toBe(false);
    expect(resolveVisibleMetricKeys(null)).toBeUndefined();
    expect(showsFishingScore(null)).toBe(true);
    expect(homeCopy(null).title).toBe('Onde vale pescar?');
    expect(homeCopy(null, 'Amanhã').title).toBe('Onde vale pescar?');
    expect(homeCopy(null).description).toBe('Escolha local e horário hoje com base nas condições.');
    expect(locationPrimaryMetricKeys(null)).toEqual(['wind', 'gusts', 'rain', 'air-temperature']);
  });

  it('esconde indicadores de swell no foco pescador', () => {
    expect(resolveVisibleMetricKeys('pescador')).toEqual([
      'wind',
      'gusts',
      'waves',
      'rain',
      'air-temperature',
      'water-temperature',
    ]);
    expect(showsFishingScore('pescador')).toBe(true);
  });

  it('prioriza mar e esconde a nota no foco surfista', () => {
    expect(resolveVisibleMetricKeys('surfista')).toEqual([
      'wind',
      'waves',
      'wave-period',
      'swell',
      'gusts',
    ]);
    expect(showsFishingScore('surfista')).toBe(false);
    expect(locationPrimaryMetricKeys('surfista')).toEqual([
      'wind',
      'waves',
      'wave-period',
      'swell',
    ]);
    expect(homeCopy('surfista').title).toBe('Como está o mar hoje?');
    expect(homeCopy('surfista', 'Amanhã').title).toBe('Como está o mar amanhã?');
  });

  it('força pesca quando a escolha de perfil está desligada', () => {
    expect(effectiveFocus('surfista', false)).toBe('pescador');
    expect(effectiveFocus(null, false)).toBe('pescador');
    expect(effectiveFocus('surfista', true)).toBe('surfista');
    expect(showsCommunity('surfista')).toBe(false);
  });

  it('intersecta o foco com os indicadores personalizados', () => {
    expect(resolveVisibleMetricKeys('surfista', ['rain', 'swell', 'wind'])).toEqual([
      'wind',
      'swell',
    ]);
  });
});
