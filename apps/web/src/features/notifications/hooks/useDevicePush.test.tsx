import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDevicePush } from './useDevicePush';

const { enableDevicePush, showSaveConfirmation } = vi.hoisted(() => ({
  enableDevicePush: vi.fn(() => Promise.resolve()),
  showSaveConfirmation: vi.fn(),
}));

vi.mock('@/app/layout/saveConfirmationEvents', () => ({ showSaveConfirmation }));
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ status: 'authenticated' }),
}));
vi.mock('../services/notificationService', () => ({
  getPushPublicKey: () => Promise.resolve({ publicKey: 'key' }),
}));
vi.mock('../services/devicePushService', () => ({
  canUseWebPush: () => true,
  disableDevicePush: vi.fn(),
  enableDevicePush,
  getCurrentPushSubscription: () => Promise.resolve(null),
  iosNeedsInstallForPush: () => false,
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useDevicePush', () => {
  beforeEach(() => {
    enableDevicePush.mockClear();
    showSaveConfirmation.mockClear();
  });

  it('confirma quando os avisos são ativados', async () => {
    const { result } = renderHook(() => useDevicePush(), { wrapper });
    await waitFor(() => expect(result.current.available).toBe(true));

    await act(() => result.current.toggle(true));

    expect(enableDevicePush).toHaveBeenCalledTimes(1);
    expect(showSaveConfirmation).toHaveBeenCalledWith('Avisos no aparelho ativados.');
  });
});
