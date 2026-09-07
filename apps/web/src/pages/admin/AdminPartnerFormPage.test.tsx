import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminPartnerFormPage } from './AdminPartnerFormPage';

const { createAdminPartner } = vi.hoisted(() => ({
  createAdminPartner: vi.fn(() => new Promise(() => undefined)),
}));

vi.mock('@/features/partners/services/partnersService', () => ({
  getAdminPartners: () => Promise.resolve([]),
  createAdminPartner,
  updateAdminPartner: vi.fn(),
}));

describe('AdminPartnerFormPage', () => {
  it('abre e salva o endereço como busca do Google Maps', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderWithProviders(<AdminPartnerFormPage />);

    await user.type(
      screen.getByRole('textbox', { name: 'Endereço ou link do Google Maps' }),
      'Rua das Gaivotas, 100, Florianópolis',
    );
    await user.click(screen.getByRole('button', { name: 'Abrir no Google Maps' }));

    const mapsUrl =
      'https://www.google.com/maps/search/?api=1&query=Rua%20das%20Gaivotas%2C%20100%2C%20Florian%C3%B3polis';
    expect(open).toHaveBeenCalledWith(mapsUrl, '_blank', 'noopener,noreferrer');

    await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Loja do Mar');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(createAdminPartner).toHaveBeenCalledWith(expect.objectContaining({ mapsUrl }));
  });
});
