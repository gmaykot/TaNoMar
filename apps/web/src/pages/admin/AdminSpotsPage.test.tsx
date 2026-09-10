import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminSpotsPage } from './AdminSpotsPage';

const xavier = {
  id: 'ilha-do-xavier',
  name: 'Ilha do Xavier',
  city: 'Florianópolis',
  state: 'SC',
  region: 'leste',
  description: null,
  type: 'ilha',
  visibility: 'shared' as const,
  profile: 'praia_protegida' as const,
  latitude: -27.6,
  longitude: -48.4,
  seaOrientationDegrees: 90,
  isFavorite: false,
  isEnabled: true,
  isInRanking: false,
  isApproved: false,
  isOwner: true,
  hasLiveWebcam: false,
};

const { approveLocation, rejectLocation } = vi.hoisted(() => ({
  approveLocation: vi.fn(() => Promise.resolve()),
  rejectLocation: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/features/locations/services/locationsService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/locations/services/locationsService')>();
  return {
    ...actual,
    getPendingLocations: () => Promise.resolve([xavier]),
    approveLocation,
    rejectLocation,
  };
});

vi.mock('@/app/layout/saveConfirmationEvents', () => ({
  showSaveConfirmation: vi.fn(),
}));

describe('AdminSpotsPage', () => {
  beforeEach(() => {
    approveLocation.mockClear();
    rejectLocation.mockClear();
  });

  it('aprova o local depois da confirmação', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminSpotsPage />);

    expect(await screen.findByText('Ilha do Xavier')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aprovar' }));
    expect(approveLocation).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Aprovar local' })).toBeInTheDocument();
    expect(
      screen.getByText('Aprovar “Ilha do Xavier”? Ele entra no mapa da comunidade.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar aprovação' }));
    expect(approveLocation).toHaveBeenCalledWith('ilha-do-xavier', expect.anything());
  });

  it('cancela a aprovação sem publicar o local', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminSpotsPage />);

    await user.click(await screen.findByRole('button', { name: 'Aprovar' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(approveLocation).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Aprovar local' })).not.toBeInTheDocument();
  });

  it('recusa o local depois da confirmação', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminSpotsPage />);

    await user.click(await screen.findByRole('button', { name: 'Recusar' }));
    expect(rejectLocation).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Recusar local' })).toBeInTheDocument();
    expect(
      screen.getByText('Recusar “Ilha do Xavier”? O ponto volta a ser privado.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar recusa' }));
    expect(rejectLocation).toHaveBeenCalledWith('ilha-do-xavier', expect.anything());
  });
});
