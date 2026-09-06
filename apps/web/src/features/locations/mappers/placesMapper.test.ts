import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { parsePlaceSuggestionList } from './placesMapper';

const sample = {
  name: 'Praia do Campeche',
  formatted: 'Praia do Campeche, Florianópolis - SC, Brasil',
  city: 'Florianópolis',
  state: 'SC',
  category: 'beach',
  latitude: -27.68,
  longitude: -48.48,
};

describe('parsePlaceSuggestionList', () => {
  it('aceita o contrato da busca de lugares', () => {
    expect(parsePlaceSuggestionList({ items: [sample] })).toEqual([
      {
        name: 'Praia do Campeche',
        formatted: 'Praia do Campeche, Florianópolis - SC, Brasil',
        city: 'Florianópolis',
        state: 'SC',
        category: 'beach',
        latitude: -27.68,
        longitude: -48.48,
      },
    ]);
  });

  it('rejeita item sem latitude ou longitude', () => {
    expect(
      parsePlaceSuggestionList({
        items: [
          sample,
          { ...sample, name: 'Sem coordenadas', latitude: null, longitude: -48.48 },
          { ...sample, name: 'Longitude ausente', longitude: undefined },
        ],
      }),
    ).toEqual([
      {
        name: 'Praia do Campeche',
        formatted: 'Praia do Campeche, Florianópolis - SC, Brasil',
        city: 'Florianópolis',
        state: 'SC',
        category: 'beach',
        latitude: -27.68,
        longitude: -48.48,
      },
    ]);
  });

  it('rejeita o envelope inválido', () => {
    expect(() => parsePlaceSuggestionList([sample])).toThrow(ContractError);
  });

  it('remove sugestões com o mesmo nome ou a menos de 200 m', () => {
    expect(
      parsePlaceSuggestionList({
        items: [
          sample,
          { ...sample, name: 'Praia do Campeche', latitude: -27.6802, longitude: -48.4801 },
          { ...sample, name: 'Outra praia', latitude: -27.5, longitude: -48.4 },
        ],
      }).map((item) => item.name),
    ).toEqual(['Praia do Campeche', 'Outra praia']);
  });
});
