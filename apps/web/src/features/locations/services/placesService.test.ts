import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchPlaces } from './placesService';

const { apiRequest } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
}));

vi.mock('@/shared/api/client', () => ({ apiRequest }));

const sample = {
  name: 'Praia do Campeche',
  formatted: 'Praia do Campeche, Florianópolis - SC, Brasil',
  city: 'Florianópolis',
  state: 'SC',
  category: 'beach',
  latitude: -27.68,
  longitude: -48.48,
};

describe('searchPlaces', () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequest.mockResolvedValue({ items: [sample] });
  });

  it('não chama a API com menos de 3 letras', async () => {
    await expect(searchPlaces('ab')).resolves.toEqual([]);
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('busca lugares a partir de 3 letras', async () => {
    await expect(searchPlaces('campeche')).resolves.toHaveLength(1);
    expect(apiRequest).toHaveBeenCalledWith('/places/autocomplete?q=campeche');
  });
});
