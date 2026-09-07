import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { locationsFixture } from '@/features/locations/fixtures/locations';
import { saveTripPlan } from '@/features/diary/diaryStorage';
import { renderWithProviders } from '@/test/renderWithProviders';
import { DiaryPage } from './DiaryPage';

vi.mock('@/features/locations/services/locationsService', () => ({
  getLocations: () => Promise.resolve(locationsFixture),
  setFavorite: vi.fn(),
  setEnabled: vi.fn(),
  createLocation: vi.fn(),
  updateLocation: vi.fn(),
  deleteLocation: vi.fn(),
  getPendingLocations: vi.fn(),
  approveLocation: vi.fn(),
  rejectLocation: vi.fn(),
}));

describe('DiaryPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('preenche o diário a partir de uma saída planejada', async () => {
    const user = userEvent.setup();
    saveTripPlan({
      spotId: 'pantano_do_sul',
      spotName: 'Pântano do Sul',
      date: '2026-09-06',
      time: '16:30–19:00',
      notes: 'Levar camarão',
    });

    renderWithProviders(<DiaryPage />);

    await user.click(await screen.findByRole('button', { name: 'Registrar no diário' }));

    expect(screen.getByLabelText('Local')).toHaveValue('pantano_do_sul');
    expect(screen.getByLabelText('Data')).toHaveValue('2026-09-06');
    expect(screen.getByLabelText('Observações')).toHaveValue('Levar camarão');
  });

  it('edita e cancela uma saída planejada', async () => {
    const user = userEvent.setup();
    saveTripPlan({
      spotId: 'pantano_do_sul',
      spotName: 'Pântano do Sul',
      date: '2026-09-06',
      time: '16:30–19:00',
      notes: '',
    });

    renderWithProviders(<DiaryPage />);

    const plan = await screen.findByRole('article');
    await user.click(within(plan).getByRole('button', { name: 'Editar' }));
    await user.clear(screen.getByLabelText('Horário'));
    await user.type(screen.getByLabelText('Horário'), '06:00');
    await user.click(screen.getByRole('button', { name: 'Salvar planejamento' }));

    expect(screen.getByText('2026-09-06 · 06:00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar saída' }));

    expect(screen.queryByRole('heading', { name: 'Saídas planejadas' })).not.toBeInTheDocument();
  });
});
