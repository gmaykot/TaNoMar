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
    expect(screen.getByRole('combobox', { name: 'Tipo de acesso' })).toHaveValue('terrestre');
    expect(
      screen.queryByRole('button', { name: 'Procurar câmera próxima' }),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Nome do local'), 'Canal da Barra da Lagoa');
    await user.click(screen.getByRole('button', { name: 'Leste da ilha' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo' }), 'canal');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ambiente' }), 'estuarino');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo de acesso' }), 'misto');
    await user.type(screen.getByLabelText('Restrições e observações'), 'Acesso pelo molhe.');
    await user.type(screen.getByLabelText('Latitude'), '-27.5738');
    await user.type(screen.getByLabelText('Longitude'), '-48.4265');
    await user.click(screen.getByRole('checkbox', { name: /Aparece no plano Free/ }));
    await user.click(screen.getByRole('button', { name: 'Cadastrar local' }));

    expect(createAdminOfficialLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Canal da Barra da Lagoa',
        region: 'leste',
        type: 'canal',
        fishingEnvironment: 'estuarino',
        accessType: 'misto',
        restrictionNotes: 'Acesso pelo molhe.',
        latitude: -27.5738,
        longitude: -48.4265,
        isActive: true,
        isFreeDefault: true,
      }),
    );
  });
});
