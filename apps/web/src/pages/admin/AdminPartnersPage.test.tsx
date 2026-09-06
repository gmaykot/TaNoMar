import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminPartnersPage } from './AdminPartnersPage';

const { setPlatformShowPartners } = vi.hoisted(() => ({
  setPlatformShowPartners: vi.fn(() => Promise.resolve({ showPartners: true })),
}));

vi.mock('@/features/partners/services/partnersService', () => ({
  getAdminPartners: () => Promise.resolve([]),
  deleteAdminPartner: vi.fn(),
  getPlatformSettings: () => Promise.resolve({ showPartners: false }),
  setPlatformShowPartners,
}));

describe('AdminPartnersPage', () => {
  it('liga a vitrine pelo checkbox do admin', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminPartnersPage />);

    const toggle = await screen.findByRole('checkbox', { name: /Mostrar vitrine de parceiros/ });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(setPlatformShowPartners).toHaveBeenCalledWith(true);
  });
});
