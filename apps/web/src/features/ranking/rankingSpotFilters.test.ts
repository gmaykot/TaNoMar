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
  it('lê descrição, nota, tipo, região e exposição da URL e ignora valores desconhecidos', () => {
    const params = new URLSearchParams(
      'descricao=costao&nota=8&tipo=praia,ilha,desconhecido&regiao=sul,leste&exposicao=praia_aberta',
    );
    expect(parseRankingSpotFilters(params)).toEqual({
      description: 'costao',
      minimumScore: 8,
      types: ['praia', 'ilha'],
      regions: ['sul', 'leste'],
      profiles: ['praia_aberta'],
    });
  });

  it('grava os filtros na query e remove chaves vazias', () => {
    const params = new URLSearchParams('enfase=vento&tipo=praia');
    writeRankingSpotFilters(params, {
      description: ' acesso fácil ',
      minimumScore: 7,
      types: [],
      regions: ['sul'],
      profiles: ['praia_protegida'],
    });
    expect(params.get('enfase')).toBe('vento');
    expect(params.get('descricao')).toBe('acesso fácil');
    expect(params.get('nota')).toBe('7');
    expect(params.get('tipo')).toBeNull();
    expect(params.get('regiao')).toBe('sul');
    expect(params.get('exposicao')).toBe('praia_protegida');
  });

  it('filtra o ranking por tipo, região e exposição sem reordenar', () => {
    const items = forecastFixture.days[0]?.ranking ?? [];
    const byId = new Map(locationsFixture.map((location) => [location.id, location]));
    const filtered = filterRankingBySpot(items, byId, {
      description: '',
      minimumScore: null,
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
        description: '',
        minimumScore: null,
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

  it('filtra pela nota mínima e pelo texto da descrição sem considerar acentos', () => {
    const items = forecastFixture.days[0]?.ranking ?? [];
    const byId = new Map(
      locationsFixture.map((location) => [
        location.id,
        location.id === 'pantano_do_sul'
          ? { ...location, description: 'Costão com acesso pela trilha' }
          : location,
      ]),
    );

    const filtered = filterRankingBySpot(items, byId, {
      ...emptyRankingSpotFilters,
      description: 'costao',
      minimumScore: 9,
    });

    expect(filtered.map((item) => item.locationId)).toEqual(['pantano_do_sul']);
  });

  it('filtra o nome do local por trecho, sem acento e sem diferenciar maiúsculas', () => {
    const items = forecastFixture.days[0]?.ranking ?? [];
    const byId = new Map(locationsFixture.map((location) => [location.id, location]));

    const filtered = filterRankingBySpot(items, byId, {
      ...emptyRankingSpotFilters,
      description: 'LAGOA',
    });

    expect(filtered.map((item) => item.locationId)).toEqual(['lagoa-conceicao', 'barra_da_lagoa']);
  });

  it('filtra o nome do local mesmo sem o cadastro carregado', () => {
    const items = forecastFixture.days[0]?.ranking ?? [];

    const filtered = filterRankingBySpot(items, new Map(), {
      ...emptyRankingSpotFilters,
      description: 'conceicao',
    });

    expect(filtered.map((item) => item.locationId)).toEqual(['lagoa-conceicao']);
  });

  it('não exige o nome inteiro para encontrar o local', () => {
    const items = forecastFixture.days[0]?.ranking ?? [];
    const byId = new Map(locationsFixture.map((location) => [location.id, location]));

    const filtered = filterRankingBySpot(items, byId, {
      ...emptyRankingSpotFilters,
      description: 'pântano',
    });

    expect(filtered.map((item) => item.locationId)).toEqual(['pantano_do_sul']);
  });
});
