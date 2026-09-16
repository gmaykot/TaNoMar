import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { BiometricOfferDrawer } from './BiometricOfferDrawer';

const { toggle, shouldOffer, hasJustLoggedIn, markHandled, clearJustLoggedIn } = vi.hoisted(() => ({
  toggle: vi.fn(() => Promise.resolve(true)),
  shouldOffer: vi.fn((userId: string) => Boolean(userId)),
  hasJustLoggedIn: vi.fn(() => true),
  markHandled: vi.fn(),
  clearJustLoggedIn: vi.fn(),
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: 'user-1', name: 'Ana', email: 'ana@example.com' },
  }),
}));

vi.mock('../hooks/useBiometricUnlock', () => ({
  useBiometricUnlock: () => ({
    available: true,
    loading: false,
    pending: false,
    error: null,
    enabled: false,
    visible: true,
    toggle,
  }),
}));

vi.mock('../services/biometricUnlock', () => ({
  isPlatformBiometricsAvailable: () => Promise.resolve(true),
  shouldOfferBiometricUnlock: (userId: string) => shouldOffer(userId),
  hasJustLoggedIn: () => hasJustLoggedIn(),
  clearJustLoggedIn,
  markBiometricOfferHandled: (userId: string) => markHandled(userId),
}));

describe('BiometricOfferDrawer', () => {
  beforeEach(() => {
    toggle.mockClear();
    shouldOffer.mockReturnValue(true);
    hasJustLoggedIn.mockReturnValue(true);
    markHandled.mockClear();
    clearJustLoggedIn.mockClear();
  });

  it('oferece a biometria só depois do login no celular', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BiometricOfferDrawer />);

    expect(
      await screen.findByRole('dialog', { name: 'Usar biometria neste celular?' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Usar biometria' }));
    await waitFor(() => expect(toggle).toHaveBeenCalledWith(true));
  });

  it('não pergunta de novo quando a pessoa recusa', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BiometricOfferDrawer />);

    expect(
      await screen.findByRole('dialog', { name: 'Usar biometria neste celular?' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(markHandled).toHaveBeenCalledWith('user-1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('não abre no desktop nem quando a oferta não cabe', async () => {
    hasJustLoggedIn.mockReturnValue(false);
    renderWithProviders(<BiometricOfferDrawer />);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
