import { describe, expect, it } from 'vitest';
import { locationsFixture } from '@/features/locations/fixtures/locations';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import {
  emptyRankingSpotFilters,
  filterRankingBySpot,
  parseRankingSpotFilters,
  rankingSpotFilterCount,
  toggleRankingFilterValue,
  writeRankingSpotFilters,
} from './rankingSpotFilters';

describe('rankingSpotFilters', () => {
  it('lê tipo, região e exposição da URL e ignora valores desconhecidos', () => {
    const params = new URLSearchParams(
      'tipo=praia,ilha,desconhecido&regiao=sul,leste&exposicao=praia_aberta',
    );
    expect(parseRankingSpotFilters(params)).toEqual({
      types: ['praia', 'ilha'],
      regions: ['sul', 'leste'],
      profiles: ['praia_aberta'],
    });
  });

  it('grava os filtros na query e remove chaves vazias', () => {
    const params = new URLSearchParams('enfase=vento&tipo=praia');
    writeRankingSpotFilters(params, {
      types: [],
      regions: ['sul'],
      profiles: ['praia_protegida'],
    });
    expect(params.get('enfase')).toBe('vento');
    expect(params.get('tipo')).toBeNull();
    expect(params.get('regiao')).toBe('sul');
    expect(params.get('exposicao')).toBe('praia_protegida');
  });

  it('filtra o ranking por tipo, região e exposição sem reordenar', () => {
    const items = forecastFixture.days[0]?.ranking ?? [];
    const byId = new Map(locationsFixture.map((location) => [location.id, location]));
    const filtered = filterRankingBySpot(items, byId, {
      types: ['praia'],
      regions: ['leste'],
      profiles: ['praia_aberta'],
    });
    expect(filtered.map((item) => item.locationId)).toEqual(['joaquina']);
  });

  it('mantém a lista inteira quando não há filtro', () => {
    const items = forecastFixture.days[0]?.ranking ?? [];
    expect(filterRankingBySpot(items, new Map(), emptyRankingSpotFilters)).toBe(items);
    expect(
      filterRankingBySpot(items, new Map(), {
        types: ['ilha'],
        regions: [],
        profiles: [],
      }),
    ).toBe(items);
    expect(rankingSpotFilterCount(emptyRankingSpotFilters)).toBe(0);
  });

  it('alterna valores do mesmo grupo', () => {
    expect(toggleRankingFilterValue(['praia'], 'ilha')).toEqual(['praia', 'ilha']);
    expect(toggleRankingFilterValue(['praia', 'ilha'], 'praia')).toEqual(['ilha']);
  });
});
