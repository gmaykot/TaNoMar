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
  region: 'sul',
  fishingEnvironment: 'mar_aberto',
  accessType: 'terrestre',
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

const xavier = {
  ...campeche,
  id: 'ilha-do-xavier',
  name: 'Ilha do Xavier',
  region: 'ilhas',
  type: 'ilha',
  fishingEnvironment: 'mar_aberto',
  accessType: 'embarcado',
  isFreeDefault: false,
  hasLiveWebcam: false,
};

const { updateAdminOfficialLocation, deleteAdminOfficialLocation } = vi.hoisted(() => ({
  updateAdminOfficialLocation: vi.fn(() => Promise.resolve(campeche)),
  deleteAdminOfficialLocation: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/features/locations/services/locationsService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/locations/services/locationsService')>();
  return {
    ...actual,
    getAdminOfficialLocations: () => Promise.resolve([campeche, xavier]),
    updateAdminOfficialLocation,
    deleteAdminOfficialLocation,
  };
});

vi.mock('@/app/layout/saveConfirmationEvents', () => ({
  showSaveConfirmation: vi.fn(),
}));

describe('AdminOfficialSpotsPage', () => {
  it('lista o local do sistema, filtra por tipo e liga o plano Free', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminOfficialSpotsPage />);

    expect(await screen.findByText('Campeche')).toBeInTheDocument();
    expect(screen.getByText('Ilha do Xavier')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo local' })).toHaveAttribute(
      'href',
      '/admin/locais-sistema/novo',
    );
    expect(screen.getAllByRole('link', { name: 'Editar' })[0]).toHaveAttribute(
      'href',
      '/admin/locais-sistema/campeche',
    );

    expect(screen.getByRole('combobox', { name: 'Região' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Tipo' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Ambiente' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Free' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Câmera' })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo' }), 'ilha');
    expect(screen.queryByText('Campeche')).not.toBeInTheDocument();
    expect(screen.getByText('Ilha do Xavier')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo' }), '');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Região' }), 'ilhas');
    expect(screen.queryByText('Campeche')).not.toBeInTheDocument();
    expect(screen.getByText('Ilha do Xavier')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Região' }), '');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Ambiente' }), 'estuarino');
    expect(screen.getByText('Nenhum local encontrado')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ambiente' }), '');

    const enabledToggle = screen.getAllByRole('checkbox', { name: 'Habilitado' })[0];
    expect(enabledToggle).toBeChecked();
    await user.click(enabledToggle);
    expect(updateAdminOfficialLocation).toHaveBeenCalledWith(
      'campeche',
      expect.objectContaining({ isActive: false, isFreeDefault: true }),
    );

    const freeToggle = screen.getAllByRole('checkbox', { name: /Aparece no plano Free/ })[0];
    expect(freeToggle).toBeChecked();
    await user.click(freeToggle);
    expect(updateAdminOfficialLocation).toHaveBeenCalledWith(
      'campeche',
      expect.objectContaining({ isFreeDefault: false, isActive: true }),
    );
  });

  it('exclui o local do sistema depois da confirmação', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<AdminOfficialSpotsPage />);

    expect(await screen.findByText('Campeche')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);
    expect(deleteAdminOfficialLocation.mock.calls[0]?.[0]).toBe('campeche');
  });
});
