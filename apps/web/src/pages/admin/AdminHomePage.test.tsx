import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminHomePage } from './AdminHomePage';

const { setPlatformShowLiveWebcams } = vi.hoisted(() => ({
  setPlatformShowLiveWebcams: vi.fn(() =>
    Promise.resolve({ showPartners: false, showLiveWebcams: false }),
  ),
}));

vi.mock('@/features/partners/services/partnersService', () => ({
  getPlatformSettings: () => Promise.resolve({ showPartners: false, showLiveWebcams: true }),
  setPlatformShowLiveWebcams,
}));

describe('AdminHomePage', () => {
  it('abre as áreas administrativas', async () => {
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
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /Mostrar câmeras ao vivo/ })).toBeChecked();
    });
  });

  it('liga ou desliga câmeras ao vivo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminHomePage />);
    const toggle = await screen.findByRole('checkbox', { name: /Mostrar câmeras ao vivo/ });
    await waitFor(() => expect(toggle).toBeEnabled());
    await user.click(toggle);
    expect(setPlatformShowLiveWebcams).toHaveBeenCalledWith(false);
  });
});
