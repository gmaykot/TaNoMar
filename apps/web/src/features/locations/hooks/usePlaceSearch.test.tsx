import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlaceSearch } from './usePlaceSearch';

const { searchPlaces } = vi.hoisted(() => ({
  searchPlaces: vi.fn(),
}));

vi.mock('../services/placesService', () => ({
  minPlaceQueryLength: 3,
  searchPlaces,
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('usePlaceSearch', () => {
  beforeEach(() => {
    searchPlaces.mockReset();
    searchPlaces.mockResolvedValue([]);
  });

  it('não chama a busca com menos de 3 letras', async () => {
    renderHook(() => usePlaceSearch('ab'), { wrapper });
    await new Promise((resolve) => {
      window.setTimeout(resolve, 400);
    });
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it('busca depois do debounce com 3 letras', async () => {
    searchPlaces.mockResolvedValue([
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
    renderHook(() => usePlaceSearch('campeche'), { wrapper });
    await waitFor(() => expect(searchPlaces).toHaveBeenCalledWith('campeche'));
  });
});
