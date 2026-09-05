import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { NotificationInbox } from './NotificationInbox';

const inbox = vi.hoisted(() => ({
  items: [] as Array<{
    id: string;
    title: string;
    body: string;
    createdAt: string;
    readAt: string | null;
  }>,
  reports: [] as Array<{
    id: string;
    spotId: string;
    spotName: string;
    type: 'condicao' | 'perigo';
    comment: string | null;
    authorName: string;
    createdAt: string;
    expiresAt: string;
    confirmations: number;
    contested: number;
    myVote: 'confirm' | 'contest' | null;
    isMine: boolean;
  }>,
  canVote: true,
  unread: false,
  listPending: false,
  listError: false,
  refetchList: vi.fn(),
  markRead: vi.fn(),
  remove: vi.fn(),
  voteReport: vi.fn(),
  votePending: false,
}));

vi.mock('../hooks/useNotificationInbox', () => ({
  useNotificationInbox: () => inbox,
}));

describe('NotificationInbox', () => {
  beforeEach(() => {
    inbox.items = [];
    inbox.reports = [];
    inbox.canVote = true;
    inbox.unread = false;
    inbox.listPending = false;
    inbox.listError = false;
    inbox.votePending = false;
    inbox.refetchList.mockReset();
    inbox.markRead.mockReset();
    inbox.remove.mockReset();
    inbox.voteReport.mockReset();
  });

  it('mostra o pontinho sem abrir o painel quando há não lida', () => {
    inbox.unread = true;
    renderWithProviders(<NotificationInbox />);

    expect(
      screen.getByRole('button', { name: 'Notificações' }).querySelector('span'),
    ).not.toBeNull();
    expect(screen.queryByRole('region', { name: 'Notificações' })).not.toBeInTheDocument();
  });

  it('mostra estado vazio quando não há avisos', async () => {
    const user = userEvent.setup();
    inbox.refetchList.mockResolvedValue(undefined);
    renderWithProviders(<NotificationInbox />);

    await user.click(screen.getByRole('button', { name: 'Notificações' }));
    expect(await screen.findByText('Nenhuma notificação no momento.')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('mostra erro quando a caixa não carrega', async () => {
    const user = userEvent.setup();
    inbox.listError = true;
    inbox.refetchList.mockResolvedValue(undefined);
    renderWithProviders(<NotificationInbox />);

    await user.click(screen.getByRole('button', { name: 'Notificações' }));
    expect(await screen.findByText('Não foi possível abrir as notificações.')).toBeInTheDocument();
  });

  it('mostra o aviso e o pontinho de não lida', async () => {
    const user = userEvent.setup();
    inbox.unread = true;
    inbox.items = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Novo relato',
        body: 'Ana relatou condição em Campeche.',
        createdAt: '2026-09-05T12:00:00Z',
        readAt: null,
      },
    ];
    inbox.refetchList.mockResolvedValue(undefined);
    renderWithProviders(<NotificationInbox />);

    await user.click(screen.getByRole('button', { name: 'Notificações' }));
    expect(await screen.findByText('Novo relato')).toBeInTheDocument();
    expect(screen.getByText('Ana relatou condição em Campeche.')).toBeInTheDocument();
    expect(screen.getByText(/05\/09/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Notificações' }).querySelector('span'),
    ).not.toBeNull();
  });

  it('mostra relato ativo para confirmar no sino', async () => {
    const user = userEvent.setup();
    inbox.unread = true;
    inbox.reports = [
      {
        id: '22222222-2222-2222-2222-222222222222',
        spotId: 'campeche',
        spotName: 'Campeche',
        type: 'condicao',
        comment: 'Mar bom para pescar',
        authorName: 'Pedro',
        createdAt: '2026-09-05T12:00:00Z',
        expiresAt: '2026-09-06T00:00:00Z',
        confirmations: 0,
        contested: 0,
        myVote: null,
        isMine: false,
      },
    ];
    inbox.refetchList.mockResolvedValue(undefined);
    renderWithProviders(<NotificationInbox />);

    await user.click(screen.getByRole('button', { name: 'Notificações' }));
    expect(await screen.findByText('Mar bom')).toBeInTheDocument();
    expect(screen.getByText(/Pedro/)).toBeInTheDocument();
    expect(screen.getByText(/05\/09/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver local' })).toHaveAttribute(
      'href',
      '/locais/campeche',
    );

    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(inbox.voteReport).toHaveBeenCalledWith({
      id: '22222222-2222-2222-2222-222222222222',
      kind: 'confirm',
    });
  });
});
