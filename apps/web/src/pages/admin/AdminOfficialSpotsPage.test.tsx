import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminOfficialSpotsPage } from './AdminOfficialSpotsPage';

const campeche = {
  id: 'campeche',
  name: 'Campeche',
  city: 'Florianópolis',
  state: 'SC',
  region: 'Sul da ilha',
  description: null,
  type: 'praia',
  visibility: 'official' as const,
  profile: 'praia_aberta' as const,
  latitude: -27.65,
  longitude: -48.46,
  seaOrientationDegrees: 110,
  isFavorite: false,
  isEnabled: true,
  isInRanking: true,
  isApproved: true,
  isOwner: false,
  hasLiveWebcam: false,
  isActive: true,
  isFreeDefault: true,
};

const { updateAdminOfficialLocation } = vi.hoisted(() => ({
  updateAdminOfficialLocation: vi.fn(() => Promise.resolve(campeche)),
}));

vi.mock('@/features/locations/services/locationsService', () => ({
  getAdminOfficialLocations: () => Promise.resolve([campeche]),
  updateAdminOfficialLocation,
  deleteAdminOfficialLocation: vi.fn(),
}));

vi.mock('@/app/layout/saveConfirmationEvents', () => ({
  showSaveConfirmation: vi.fn(),
}));

describe('AdminOfficialSpotsPage', () => {
  it('lista o local do sistema e liga o plano Free', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminOfficialSpotsPage />);

    expect(await screen.findByText('Campeche')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo local' })).toHaveAttribute(
      'href',
      '/admin/locais-sistema/novo',
    );
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute(
      'href',
      '/admin/locais-sistema/campeche',
    );

    const freeToggle = screen.getByRole('checkbox', { name: /Aparece no plano Free/ });
    expect(freeToggle).toBeChecked();
    await user.click(freeToggle);
    expect(updateAdminOfficialLocation).toHaveBeenCalledWith(
      'campeche',
      expect.objectContaining({ isFreeDefault: false, isActive: true }),
    );
  });
});
