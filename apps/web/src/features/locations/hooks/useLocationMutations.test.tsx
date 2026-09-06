import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { locationsFixture } from '../fixtures/locations';
import { useLocationMutations } from './useLocationMutations';

const { createLocation } = vi.hoisted(() => ({
  createLocation: vi.fn(),
}));

vi.mock('../services/locationsService', () => ({
  createLocation,
  updateLocation: vi.fn(),
  deleteLocation: vi.fn(),
  setEnabled: vi.fn(),
  setFavorite: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { wrapper, invalidate };
}

describe('useLocationMutations', () => {
  beforeEach(() => {
    createLocation.mockReset();
    createLocation.mockResolvedValue(locationsFixture[0]);
  });

  it('invalida locais e ranking depois de cadastrar um local', async () => {
    const { wrapper, invalidate } = createWrapper();
    const { result } = renderHook(() => useLocationMutations(), { wrapper });

    result.current.create.mutate({
      name: 'Molhe da Barra',
      latitude: -27.43,
      longitude: -48.52,
      shared: false,
      seaOrientationDegrees: 90,
      profile: 'praia_semi_aberta',
    });

    await waitFor(() => expect(result.current.create.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['locations'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['forecast'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['location-forecast'] });
  });
});
