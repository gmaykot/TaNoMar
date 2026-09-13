import { describe, expect, it } from 'vitest';
import {
  bearingDegrees,
  compassLabel,
  compassPoint,
  formatBearing,
  formatCoordinatePair,
  formatDistance,
  hasSpotCoordinates,
  headingDelta,
} from './geoMath';

describe('geoMath', () => {
  it('calcula rumo leste entre dois pontos na mesma latitude', () => {
    const bearing = bearingDegrees(-27.65407, -48.47908, -27.65407, -48.46908);
    expect(bearing).toBeGreaterThan(80);
    expect(bearing).toBeLessThan(100);
    expect(compassPoint(bearing)).toBe('L');
    expect(compassLabel(90)).toBe('Leste');
  });

  it('formata distância, rumo e coordenadas em pt-BR', () => {
    expect(formatDistance(240)).toBe('240 m');
    expect(formatDistance(2400)).toBe('2,4 km');
    expect(formatBearing(141.6)).toBe('142°');
    expect(formatCoordinatePair(-27.65407, -48.46908)).toBe('27,65407° S · 48,46908° O');
  });

  it('indica o menor giro até o rumo', () => {
    expect(headingDelta(10, 30)).toBe(20);
    expect(headingDelta(350, 10)).toBe(20);
    expect(headingDelta(10, 350)).toBe(-20);
  });

  it('só aceita coordenadas finitas', () => {
    expect(hasSpotCoordinates({ latitude: -27.6, longitude: -48.5 })).toBe(true);
    expect(hasSpotCoordinates({ latitude: null, longitude: -48.5 })).toBe(false);
    expect(hasSpotCoordinates({ latitude: Number.NaN, longitude: -48.5 })).toBe(false);
  });
});
