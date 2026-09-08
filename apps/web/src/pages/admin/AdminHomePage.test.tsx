import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminHomePage } from './AdminHomePage';

const { setPlatformShowAppFocus, settingsState } = vi.hoisted(() => ({
  setPlatformShowAppFocus: vi.fn(() =>
    Promise.resolve({ showPartners: false, showAppFocus: true }),
  ),
  settingsState: { showAppFocus: false },
}));

vi.mock('@/features/partners/hooks/usePartners', () => ({
  platformSettingsQueryKey: ['admin-platform-settings'],
  usePlatformSettings: () => ({
    isPending: false,
    data: { showPartners: false, showAppFocus: settingsState.showAppFocus },
  }),
}));

vi.mock('@/features/partners/services/partnersService', () => ({
  setPlatformShowAppFocus,
}));

vi.mock('@/app/layout/saveConfirmationEvents', () => ({
  showSaveConfirmation: vi.fn(),
}));

describe('AdminHomePage', () => {
  beforeEach(() => {
    settingsState.showAppFocus = false;
    setPlatformShowAppFocus.mockClear();
  });

  it('abre as áreas administrativas', () => {
    renderWithProviders(<AdminHomePage />);
    expect(screen.getByRole('link', { name: /Moderação/ })).toHaveAttribute(
      'href',
      '/admin/locais',
    );
    expect(screen.getByRole('link', { name: /Usuários/ })).toHaveAttribute(
      'href',
      '/admin/usuarios',
    );
    expect(screen.getByRole('link', { name: /Parceiros/ })).toHaveAttribute(
      'href',
      '/admin/parceiros',
    );
    expect(screen.getByRole('link', { name: /Planos/ })).toHaveAttribute('href', '/admin/planos');
  });

  it('liga a escolha de perfil pelo admin', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminHomePage />);

    const toggle = screen.getByRole('checkbox', { name: /Permitir escolha de perfil/ });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);

    await waitFor(() => {
      expect(setPlatformShowAppFocus).toHaveBeenCalledWith(true);
    });
  });
});
