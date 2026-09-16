import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { BiometricUnlockPreference } from './BiometricUnlockPreference';

const { toggle, biometric } = vi.hoisted(() => ({
  toggle: vi.fn(),
  biometric: {
    available: true,
    loading: false,
    pending: false,
    error: null as string | null,
    enabled: false,
    visible: true,
  },
}));

vi.mock('@/features/auth/hooks/useBiometricUnlock', () => ({
  useBiometricUnlock: () => ({
    ...biometric,
    toggle,
  }),
}));

describe('BiometricUnlockPreference', () => {
  beforeEach(() => {
    biometric.available = true;
    biometric.visible = true;
    biometric.enabled = false;
    biometric.error = null;
    toggle.mockReset();
  });

  it('mostra a opção no celular e liga a biometria', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BiometricUnlockPreference />);

    expect(screen.getByRole('heading', { name: 'Neste aparelho' })).toBeInTheDocument();
    await user.click(
      screen.getByRole('checkbox', { name: /Pedir Face ID, Touch ID ou a digital ao entrar/ }),
    );
    expect(toggle).toHaveBeenCalledWith(true);
  });

  it('não renderiza a opção quando ela não cabe neste aparelho', () => {
    biometric.visible = false;
    renderWithProviders(<BiometricUnlockPreference />);
    expect(screen.queryByRole('heading', { name: 'Neste aparelho' })).not.toBeInTheDocument();
  });
});
