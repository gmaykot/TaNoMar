import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminHomePage } from './AdminHomePage';

const { setPlatformShowAppFocus, setPlatformShowLiveWebcams, settingsState } = vi.hoisted(() => ({
  setPlatformShowAppFocus: vi.fn(() =>
    Promise.resolve({ showPartners: false, showAppFocus: true, showLiveWebcams: true }),
  ),
  setPlatformShowLiveWebcams: vi.fn(() =>
    Promise.resolve({ showPartners: false, showAppFocus: false, showLiveWebcams: false }),
  ),
  settingsState: { showAppFocus: false, showLiveWebcams: true },
}));

vi.mock('@/features/partners/hooks/usePartners', () => ({
  platformSettingsQueryKey: ['admin-platform-settings'],
  usePlatformSettings: () => ({
    isPending: false,
    data: {
      showPartners: false,
      showAppFocus: settingsState.showAppFocus,
      showLiveWebcams: settingsState.showLiveWebcams,
    },
  }),
}));

vi.mock('@/features/partners/services/partnersService', () => ({
  setPlatformShowAppFocus,
  setPlatformShowLiveWebcams,
}));

vi.mock('@/app/layout/saveConfirmationEvents', () => ({
  showSaveConfirmation: vi.fn(),
}));

describe('AdminHomePage', () => {
  beforeEach(() => {
    settingsState.showAppFocus = false;
    settingsState.showLiveWebcams = true;
    setPlatformShowAppFocus.mockClear();
    setPlatformShowLiveWebcams.mockClear();
  });

  it('abre as áreas administrativas', () => {
    renderWithProviders(<AdminHomePage />);
    expect(screen.getByRole('link', { name: /Auditoria de dados/ })).toHaveAttribute(
      'href',
      '/admin/auditoria',
    );
    expect(screen.getByRole('link', { name: /Locais do sistema/ })).toHaveAttribute(
      'href',
      '/admin/locais-sistema',
    );
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
    expect(screen.getByRole('link', { name: /Workers/ })).toHaveAttribute(
      'href',
      '/admin/workers',
    );
    expect(screen.getByRole('checkbox', { name: /Mostrar câmeras ao vivo/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Permitir escolha de perfil/ })).not.toBeChecked();
  });

  it('liga ou desliga câmeras ao vivo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminHomePage />);
    const toggle = screen.getByRole('checkbox', { name: /Mostrar câmeras ao vivo/ });
    await user.click(toggle);
    expect(setPlatformShowLiveWebcams).toHaveBeenCalledWith(false);
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
