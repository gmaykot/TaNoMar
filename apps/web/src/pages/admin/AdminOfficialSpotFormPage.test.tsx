import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminOfficialSpotFormPage } from './AdminOfficialSpotFormPage';

const { createAdminOfficialLocation } = vi.hoisted(() => ({
  createAdminOfficialLocation: vi.fn(() => new Promise(() => undefined)),
}));

vi.mock('@/features/locations/hooks/usePlaceSearch', () => ({
  usePlaceSearch: () => ({ items: [], isFetching: false, error: false }),
}));

vi.mock('@/features/locations/services/locationsService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/locations/services/locationsService')>();
  return {
    ...actual,
    getAdminOfficialLocations: () => Promise.resolve([]),
    createAdminOfficialLocation,
    updateAdminOfficialLocation: vi.fn(),
    deleteAdminOfficialLocation: vi.fn(),
  };
});

describe('AdminOfficialSpotFormPage', () => {
  it('cadastra local do sistema com os campos de Meus locais', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminOfficialSpotFormPage />);

    expect(
      await screen.findByRole('heading', { name: 'Novo local do sistema' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: /Compartilhar com a comunidade/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Local habilitado/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Aparece no plano Free/ })).not.toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Tipo' })).toHaveValue('praia');
    expect(screen.getByRole('combobox', { name: 'Ambiente' })).toHaveValue('mar_aberto');

    await user.type(screen.getByLabelText('Nome do local'), 'Praia Mole');
    await user.click(screen.getByRole('button', { name: 'Leste da ilha' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo' }), 'praia');
    await user.type(screen.getByLabelText('Latitude'), '-27.601');
    await user.type(screen.getByLabelText('Longitude'), '-48.432');
    await user.click(screen.getByRole('checkbox', { name: /Aparece no plano Free/ }));
    await user.click(screen.getByRole('button', { name: 'Cadastrar local' }));

    expect(createAdminOfficialLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Praia Mole',
        region: 'leste',
        type: 'praia',
        fishingEnvironment: 'mar_aberto',
        accessType: 'terrestre',
        latitude: -27.601,
        longitude: -48.432,
        isActive: true,
        isFreeDefault: true,
      }),
    );
  });
});
