import { describe, expect, it } from 'vitest';
import {
  islandWideRegion,
  parseRegions,
  regionLabel,
  regionOptions,
  resolveRegion,
  resolveSpotRegion,
  serializeRegions,
  toggleRegions,
} from './regions';

describe('regions', () => {
  it('normaliza nomes antigos para os códigos atuais', () => {
    expect(resolveRegion('Florianópolis')).toBe(islandWideRegion);
    expect(resolveRegion('Meu mapa')).toBe(islandWideRegion);
    expect(resolveRegion('')).toBe(islandWideRegion);
    expect(resolveRegion('Sul da ilha')).toBe('sul');
    expect(resolveRegion('Continente')).toBe('continente');
    expect(resolveSpotRegion('Ilha de Santa Catarina')).toBe('');
    expect(regionLabel('sul')).toBe('Sul');
  });

  it('lê e grava várias regiões no mesmo campo de texto', () => {
    expect(parseRegions('Florianópolis')).toEqual([islandWideRegion]);
    expect(parseRegions('Norte da ilha | Sul da ilha')).toEqual(['norte', 'sul']);
    expect(serializeRegions(['sul', 'leste'])).toBe('sul | leste');
    expect(serializeRegions(['norte', 'leste', 'sul', 'oeste'])).toBe(islandWideRegion);
    expect(serializeRegions(['norte', 'leste', 'sul', 'oeste', 'continente'])).toBe(
      `${islandWideRegion} | continente`,
    );
  });

  it('alterna setores sem deixar a preferência vazia', () => {
    expect(toggleRegions([islandWideRegion], 'sul')).toEqual(['sul']);
    expect(toggleRegions(['sul'], 'leste')).toEqual(['sul', 'leste']);
    expect(toggleRegions(['sul', 'leste'], 'sul')).toEqual(['leste']);
    expect(toggleRegions(['leste'], 'leste')).toEqual([islandWideRegion]);
    expect(toggleRegions(['sul'], islandWideRegion)).toEqual([islandWideRegion]);
  });

  it('combina toda a ilha com continente e ilhas', () => {
    expect(toggleRegions([islandWideRegion], 'continente')).toEqual([
      islandWideRegion,
      'continente',
    ]);
    expect(toggleRegions([islandWideRegion, 'continente'], 'ilhas')).toEqual([
      islandWideRegion,
      'continente',
      'ilhas',
    ]);
    expect(toggleRegions([islandWideRegion, 'continente'], 'sul')).toEqual(['sul', 'continente']);
  });

  it('inclui valor atual fora da lista sem perder a seleção', () => {
    const options = regionOptions('Costa da Lagoa');
    expect(options.some((option) => option.value === 'Costa da Lagoa')).toBe(true);
    expect(options.some((option) => option.value === islandWideRegion)).toBe(true);
  });

  it('no cadastro do local não oferece toda a ilha', () => {
    const options = regionOptions('sul', 'spot');
    expect(options.some((option) => option.value === islandWideRegion)).toBe(false);
    expect(options.some((option) => option.value === 'continente')).toBe(true);
  });
});
