import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { CommunityReports } from './CommunityReports';

const createReport = vi.fn();
const deleteReport = vi.fn();
const getReports = vi.fn();

vi.mock('../services/communityService', () => ({
  getReports: (...args: unknown[]) => getReports(...args),
  createReport: (...args: unknown[]) => createReport(...args),
  confirmReport: vi.fn(),
  contestReport: vi.fn(),
  deleteReport: (...args: unknown[]) => deleteReport(...args),
}));

describe('CommunityReports', () => {
  beforeEach(() => {
    createReport.mockReset();
    deleteReport.mockReset();
    getReports.mockReset();
  });

  it('envia um atalho com tipo e comentário prontos', async () => {
    const user = userEvent.setup();
    getReports.mockResolvedValue([]);
    createReport.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      spotId: 'campeche',
      spotName: 'Campeche',
      type: 'condicao',
      comment: 'Deu peixe',
      createdAt: '2026-09-05T12:00:00Z',
      expiresAt: '2026-09-06T00:00:00Z',
      confirmations: 0,
      contested: 0,
      myVote: null,
      isMine: true,
    });

    renderWithProviders(<CommunityReports spotId="campeche" canReport />);

    await user.click(await screen.findByRole('button', { name: 'Relatar Deu peixe' }));

    expect(createReport).toHaveBeenCalledWith('campeche', 'condicao', 'Deu peixe');
  });

  it('permite apagar o próprio relato', async () => {
    const user = userEvent.setup();
    getReports.mockResolvedValue([
      {
        id: '22222222-2222-2222-2222-222222222222',
        spotId: 'campeche',
        spotName: 'Campeche',
        type: 'condicao',
        comment: 'Deu peixe',
        createdAt: '2026-09-05T12:00:00Z',
        expiresAt: '2026-09-06T00:00:00Z',
        confirmations: 0,
        contested: 0,
        myVote: null,
        isMine: true,
      },
    ]);
    deleteReport.mockResolvedValue(undefined);

    renderWithProviders(<CommunityReports spotId="campeche" canReport />);

    await user.click(await screen.findByRole('button', { name: 'Apagar' }));

    expect(deleteReport).toHaveBeenCalledWith('22222222-2222-2222-2222-222222222222');
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
  });
});
