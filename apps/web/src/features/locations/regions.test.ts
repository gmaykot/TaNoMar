import { describe, expect, it } from 'vitest';
import {
  islandWideRegion,
  parseRegions,
  regionOptions,
  resolveRegion,
  serializeRegions,
  toggleRegions,
} from './regions';

describe('regions', () => {
  it('normaliza nomes antigos para a ilha inteira', () => {
    expect(resolveRegion('Florianópolis')).toBe(islandWideRegion);
    expect(resolveRegion('Meu mapa')).toBe(islandWideRegion);
    expect(resolveRegion('')).toBe(islandWideRegion);
    expect(resolveRegion('Sul da ilha')).toBe('Sul da ilha');
    expect(resolveRegion('Continente')).toBe('Continente');
  });

  it('lê e grava várias regiões no mesmo campo de texto', () => {
    expect(parseRegions('Florianópolis')).toEqual([islandWideRegion]);
    expect(parseRegions('Norte da ilha | Sul da ilha')).toEqual(['Norte da ilha', 'Sul da ilha']);
    expect(serializeRegions(['Sul da ilha', 'Leste da ilha'])).toBe('Sul da ilha | Leste da ilha');
    expect(
      serializeRegions(['Norte da ilha', 'Leste da ilha', 'Sul da ilha', 'Oeste da ilha']),
    ).toBe(islandWideRegion);
  });

  it('alterna setores sem deixar a preferência vazia', () => {
    expect(toggleRegions([islandWideRegion], 'Sul da ilha')).toEqual(['Sul da ilha']);
    expect(toggleRegions(['Sul da ilha'], 'Leste da ilha')).toEqual([
      'Sul da ilha',
      'Leste da ilha',
    ]);
    expect(toggleRegions(['Sul da ilha', 'Leste da ilha'], 'Sul da ilha')).toEqual([
      'Leste da ilha',
    ]);
    expect(toggleRegions(['Leste da ilha'], 'Leste da ilha')).toEqual([islandWideRegion]);
    expect(toggleRegions(['Sul da ilha'], islandWideRegion)).toEqual([islandWideRegion]);
  });

  it('inclui valor atual fora da lista sem perder a seleção', () => {
    const options = regionOptions('Costa da Lagoa');
    expect(options.some((option) => option.value === 'Costa da Lagoa')).toBe(true);
    expect(options.some((option) => option.value === islandWideRegion)).toBe(true);
  });
});
