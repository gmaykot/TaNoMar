import { describe, expect, it } from 'vitest';
import {
  arrivalModeDescription,
  arrivalModeTitle,
  arrivalModesForAccess,
  boatDisclaimer,
} from './arrivalModes';

describe('arrivalModesForAccess', () => {
  it('escolhe o modo pelo tipo de acesso do local', () => {
    expect(arrivalModesForAccess('terrestre')).toEqual(['driving']);
    expect(arrivalModesForAccess('trilha')).toEqual(['driving', 'walking']);
    expect(arrivalModesForAccess('embarcado')).toEqual(['boat']);
    expect(arrivalModesForAccess('caiaque')).toEqual(['boat']);
    expect(arrivalModesForAccess('misto')).toEqual(['driving', 'boat']);
    expect(arrivalModesForAccess(null)).toEqual(['driving', 'boat']);
  });

  it('usa rótulo de caiaque quando o acesso é de caiaque', () => {
    expect(arrivalModeTitle('boat', 'caiaque')).toBe('De caiaque');
    expect(arrivalModeTitle('boat', 'embarcado')).toBe('De barco');
    expect(arrivalModeDescription('driving')).toMatch(/rota até o local/);
    expect(boatDisclaimer()).toMatch(/carta náutica/);
  });
});
