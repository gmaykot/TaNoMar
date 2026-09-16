import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBiometricUnlock } from './useBiometricUnlock';

const { enableBiometricUnlock, disableBiometricUnlock, showSaveConfirmation, available } =
  vi.hoisted(() => ({
    enableBiometricUnlock: vi.fn(() => Promise.resolve()),
    disableBiometricUnlock: vi.fn(),
    showSaveConfirmation: vi.fn(),
    available: { value: true },
  }));

vi.mock('@/app/layout/saveConfirmationEvents', () => ({ showSaveConfirmation }));
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: 'user-1', name: 'Ana', email: 'ana@example.com' },
  }),
}));
vi.mock('../services/biometricUnlock', async () => {
  const actual = await vi.importActual<typeof import('../services/biometricUnlock')>(
    '../services/biometricUnlock',
  );
  return {
    ...actual,
    enableBiometricUnlock,
    disableBiometricUnlock,
    isPlatformBiometricsAvailable: () => Promise.resolve(available.value),
    isBiometricUnlockEnabledFor: () => false,
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useBiometricUnlock', () => {
  beforeEach(() => {
    available.value = true;
    enableBiometricUnlock.mockClear();
    disableBiometricUnlock.mockClear();
    showSaveConfirmation.mockClear();
  });

  it('ativa a biometria neste aparelho', async () => {
    const { result } = renderHook(() => useBiometricUnlock(), { wrapper });
    await waitFor(() => expect(result.current.available).toBe(true));

    await act(() => result.current.toggle(true));

    expect(enableBiometricUnlock).toHaveBeenCalledTimes(1);
    expect(showSaveConfirmation).toHaveBeenCalledWith('Biometria ativada neste aparelho.');
    expect(result.current.enabled).toBe(true);
  });

  it('não fica visível quando o aparelho não tem biometria', async () => {
    available.value = false;
    const { result } = renderHook(() => useBiometricUnlock(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.visible).toBe(false);
  });
});
