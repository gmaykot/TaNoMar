import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractError } from '@/shared/api/errors';
import { renderWithProviders } from '@/test/renderWithProviders';
import { NotificationInbox } from './NotificationInbox';

const getNotifications = vi.fn();

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: {
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      pictureUrl: null,
      role: 'User',
      plan: { code: 'premium', name: 'Premium' },
      entitlements: {
        maxForecastDays: 8,
        maxFavorites: 20,
        maxPersonalSpots: 10,
        maxAlerts: 10,
      },
      preferences: { region: 'Florianópolis', windUnit: 'kmh', forecastNotifications: true },
    },
    userLoading: false,
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('../services/notificationService', () => ({
  getNotifications: (...args: unknown[]) => getNotifications(...args),
  markNotificationRead: vi.fn(),
  removeNotification: vi.fn(),
}));

describe('NotificationInbox', () => {
  beforeEach(() => {
    getNotifications.mockReset();
  });

  it('mostra estado vazio quando não há avisos', async () => {
    const user = userEvent.setup();
    getNotifications.mockResolvedValue([]);
    renderWithProviders(<NotificationInbox />);

    await user.click(screen.getByRole('button', { name: 'Notificações' }));
    expect(await screen.findByText('Nenhuma notificação no momento.')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('mostra erro quando a caixa não carrega', async () => {
    const user = userEvent.setup();
    getNotifications.mockRejectedValue(new ContractError('Lista de notificações inválida.'));
    renderWithProviders(<NotificationInbox />);

    await user.click(screen.getByRole('button', { name: 'Notificações' }));
    expect(await screen.findByText('Não foi possível abrir as notificações.')).toBeInTheDocument();
  });

  it('mostra o aviso e o pontinho de não lida', async () => {
    const user = userEvent.setup();
    getNotifications.mockResolvedValue([
      {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Novo relato',
        body: 'Alguém relatou condição em Campeche.',
        createdAt: '2026-09-05T12:00:00Z',
        readAt: null,
      },
    ]);
    renderWithProviders(<NotificationInbox />);

    await user.click(screen.getByRole('button', { name: 'Notificações' }));
    expect(await screen.findByText('Novo relato')).toBeInTheDocument();
    expect(screen.getByText('Alguém relatou condição em Campeche.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notificações' }).querySelector('span')).not.toBeNull();
  });
});
