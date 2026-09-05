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
  unread: false,
  listPending: false,
  listError: false,
  refetchList: vi.fn(),
  markRead: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../hooks/useNotificationInbox', () => ({
  useNotificationInbox: () => inbox,
}));

describe('NotificationInbox', () => {
  beforeEach(() => {
    inbox.items = [];
    inbox.unread = false;
    inbox.listPending = false;
    inbox.listError = false;
    inbox.refetchList.mockReset();
    inbox.markRead.mockReset();
    inbox.remove.mockReset();
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
        body: 'Alguém relatou condição em Campeche.',
        createdAt: '2026-09-05T12:00:00Z',
        readAt: null,
      },
    ];
    inbox.refetchList.mockResolvedValue(undefined);
    renderWithProviders(<NotificationInbox />);

    await user.click(screen.getByRole('button', { name: 'Notificações' }));
    expect(await screen.findByText('Novo relato')).toBeInTheDocument();
    expect(screen.getByText('Alguém relatou condição em Campeche.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Notificações' }).querySelector('span'),
    ).not.toBeNull();
  });
});
