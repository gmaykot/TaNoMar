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
      authorName: 'Ana',
      createdAt: '2026-09-05T12:00:00Z',
      expiresAt: '2026-09-06T00:00:00Z',
      confirmations: 0,
      contested: 0,
      myVote: null,
      isMine: true,
    });

    renderWithProviders(<CommunityReports spotId="campeche" canReport />);

    await user.click(await screen.findByRole('button', { name: 'Relatar Deu peixe' }));

    expect(createReport).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Enviar relato' })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Confirmar envio' }));

    expect(createReport).toHaveBeenCalledWith('campeche', 'condicao', 'Deu peixe');
    expect(
      await screen.findByText('Relato enviado. Os outros pescadores receberam um aviso no sino.'),
    ).toBeInTheDocument();
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
        authorName: 'Ana',
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

    expect(deleteReport).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Apagar relato' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Confirmar exclusão' }));

    expect(deleteReport).toHaveBeenCalledWith('22222222-2222-2222-2222-222222222222');
  });

  it('bloqueia confirmar e contestar no plano Free com cadeado Premium', async () => {
    getReports.mockResolvedValue([
      {
        id: '33333333-3333-3333-3333-333333333333',
        spotId: 'campeche',
        spotName: 'Campeche',
        type: 'condicao',
        comment: 'Mar bom',
        authorName: 'João',
        createdAt: '2026-09-05T12:00:00Z',
        expiresAt: '2026-09-06T00:00:00Z',
        confirmations: 1,
        contested: 0,
        myVote: null,
        isMine: false,
      },
    ]);

    renderWithProviders(<CommunityReports spotId="campeche" canReport canVote={false} />);

    const confirm = await screen.findByRole('button', {
      name: 'Confirmar bloqueado no plano atual',
    });
    const contest = screen.getByRole('button', { name: 'Contestar bloqueado no plano atual' });
    expect(confirm).toBeDisabled();
    expect(contest).toBeDisabled();
    expect(confirm).toHaveTextContent('Confirmar');
    expect(contest).toHaveTextContent('Contestar');
  });

  it('libera confirmar e contestar no plano Premium', async () => {
    getReports.mockResolvedValue([
      {
        id: '33333333-3333-3333-3333-333333333333',
        spotId: 'campeche',
        spotName: 'Campeche',
        type: 'condicao',
        comment: 'Mar bom',
        authorName: 'João',
        createdAt: '2026-09-05T12:00:00Z',
        expiresAt: '2026-09-06T00:00:00Z',
        confirmations: 1,
        contested: 0,
        myVote: null,
        isMine: false,
      },
    ]);

    renderWithProviders(<CommunityReports spotId="campeche" canReport canVote />);

    expect(await screen.findByRole('button', { name: 'Confirmar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Contestar' })).toBeEnabled();
    expect(screen.getByText(/João/)).toBeInTheDocument();
    expect(screen.getByText(/05\/09/)).toBeInTheDocument();
  });

  it('bloqueia o mesmo atalho no mesmo local no mesmo dia', async () => {
    getReports.mockResolvedValue([
      {
        id: '22222222-2222-2222-2222-222222222222',
        spotId: 'campeche',
        spotName: 'Campeche',
        type: 'condicao',
        comment: 'Deu peixe',
        authorName: 'Ana',
        createdAt: new Date().toISOString(),
        expiresAt: '2026-09-06T00:00:00Z',
        confirmations: 0,
        contested: 0,
        myVote: null,
        isMine: true,
      },
    ]);

    renderWithProviders(<CommunityReports spotId="campeche" canReport />);

    expect(
      await screen.findByRole('button', { name: 'Você já relatou Deu peixe hoje neste local' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Relatar Mar bom' })).toBeEnabled();
    expect(screen.getByText(/Você/)).toBeInTheDocument();
  });

  it('cancela o envio sem publicar o relato', async () => {
    const user = userEvent.setup();
    getReports.mockResolvedValue([]);

    renderWithProviders(<CommunityReports spotId="campeche" canReport />);

    await user.click(await screen.findByRole('button', { name: 'Relatar Mar ruim' }));
    expect(screen.getByRole('dialog', { name: 'Enviar relato' })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(createReport).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Confirmar envio' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar relato' })).toBeInTheDocument();
  });

  it('cancela a exclusão sem apagar o relato', async () => {
    const user = userEvent.setup();
    getReports.mockResolvedValue([
      {
        id: '22222222-2222-2222-2222-222222222222',
        spotId: 'campeche',
        spotName: 'Campeche',
        type: 'condicao',
        comment: 'Deu peixe',
        authorName: 'Ana',
        createdAt: '2026-09-05T12:00:00Z',
        expiresAt: '2026-09-06T00:00:00Z',
        confirmations: 0,
        contested: 0,
        myVote: null,
        isMine: true,
      },
    ]);

    renderWithProviders(<CommunityReports spotId="campeche" canReport />);

    await user.click(await screen.findByRole('button', { name: 'Apagar' }));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(deleteReport).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Confirmar exclusão' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apagar' })).toBeInTheDocument();
  });

  it('fecha a gaveta ao tocar fora', async () => {
    const user = userEvent.setup();
    getReports.mockResolvedValue([]);

    renderWithProviders(<CommunityReports spotId="campeche" canReport />);

    await user.click(await screen.findByRole('button', { name: 'Relatar Deu peixe' }));
    await user.click(screen.getByRole('button', { name: 'Fechar confirmação' }));

    expect(createReport).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Enviar relato' })).not.toBeInTheDocument();
  });
});
