import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { parseAppFocus } from './authService';

describe('parseAppFocus', () => {
  it('aceita ausência e os três focos', () => {
    expect(parseAppFocus(undefined)).toBeNull();
    expect(parseAppFocus(null)).toBeNull();
    expect(parseAppFocus('')).toBeNull();
    expect(parseAppFocus('pescador')).toBe('pescador');
    expect(parseAppFocus('surfista')).toBe('surfista');
    expect(parseAppFocus('ambos')).toBe('ambos');
  });

  it('rejeita valor fora do contrato', () => {
    expect(() => parseAppFocus('kitesurf')).toThrow(ContractError);
  });
});
