import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminUsersPage } from './AdminUsersPage';

const { setAdminUserPlan } = vi.hoisted(() => ({
  setAdminUserPlan: vi.fn(() =>
    Promise.resolve({
      id: 'user-2',
      name: 'Beto',
      email: 'beto@example.com',
      pictureUrl: null,
      role: 'User',
      isActive: true,
      plan: { code: 'premium', name: 'Premium' },
      createdAt: '2026-09-05T12:00:00+00:00',
      isSelf: false,
      protection: null,
      canChangePlan: true,
      canDeactivate: true,
    }),
  ),
}));

vi.mock('@/features/admin-users/services/adminUsersService', () => ({
  getAdminUsers: () =>
    Promise.resolve([
      {
        id: 'user-1',
        name: 'Ana Costa',
        email: 'ana@example.com',
        pictureUrl: null,
        role: 'Admin',
        isActive: true,
        plan: { code: 'premium', name: 'Premium' },
        createdAt: '2026-09-01T12:00:00+00:00',
        isSelf: true,
        protection: 'self',
        canChangePlan: true,
        canDeactivate: false,
      },
      {
        id: 'user-2',
        name: 'Beto Lima',
        email: 'beto@example.com',
        pictureUrl: null,
        role: 'User',
        isActive: true,
        plan: { code: 'free', name: 'Free' },
        createdAt: '2026-09-04T12:00:00+00:00',
        isSelf: false,
        protection: null,
        canChangePlan: true,
        canDeactivate: true,
      },
    ]),
  setAdminUserPlan,
  setAdminUserActive: vi.fn(),
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: 'user-1' },
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('AdminUsersPage', () => {
  it('lista contas e filtra por nome sem acento', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);

    expect(await screen.findByText('2 contas encontradas')).toBeInTheDocument();
    expect(screen.getByText('Ana Costa')).toBeInTheDocument();
    expect(screen.getByText('Beto Lima')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar usuários' }), 'beto');
    expect(screen.getByText('1 conta encontrada')).toBeInTheDocument();
    expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument();
  });

  it('promove um usuário para Premium', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);
    const beto = (await screen.findByText('Beto Lima')).closest('article');
    expect(beto).toBeTruthy();
    await user.click(within(beto as HTMLElement).getByRole('button', { name: 'Premium' }));
    expect(setAdminUserPlan).toHaveBeenCalledWith('user-2', 'premium');
  });
});
