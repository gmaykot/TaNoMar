import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminUsersPage } from './AdminUsersPage';

const { setAdminUserPlan, setAdminUserActive } = vi.hoisted(() => ({
  setAdminUserPlan: vi.fn(() =>
    Promise.resolve({
      id: 'user-2',
      name: 'Beto',
      email: 'beto@example.com',
      pictureUrl: null,
      role: 'User',
      isActive: true,
      plan: { code: 'premium', name: 'Mestre' },
      createdAt: '2026-09-05T12:00:00+00:00',
      isSelf: false,
      protection: null,
      canChangePlan: true,
      canDeactivate: true,
    }),
  ),
  setAdminUserActive: vi.fn(() =>
    Promise.resolve({
      id: 'user-2',
      name: 'Beto',
      email: 'beto@example.com',
      pictureUrl: null,
      role: 'User',
      isActive: false,
      plan: { code: 'free', name: 'Free' },
      createdAt: '2026-09-04T12:00:00+00:00',
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
        plan: { code: 'premium', name: 'Mestre' },
        createdAt: '2026-09-01T12:00:00+00:00',
        isSelf: true,
        protection: 'bootstrap',
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
  setAdminUserActive,
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
  beforeEach(() => {
    setAdminUserPlan.mockClear();
    setAdminUserActive.mockClear();
  });

  it('lista contas e filtra por nome sem acento', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);

    expect(await screen.findByText('2 contas encontradas')).toBeInTheDocument();
    expect(screen.getByText('Ana Costa')).toBeInTheDocument();
    expect(screen.getByText('Conta inicial')).toBeInTheDocument();
    expect(screen.getByText('Beto Lima')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar usuários' }), 'beto');
    expect(screen.getByText('1 conta encontrada')).toBeInTheDocument();
    expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument();
  });

  it('promove um usuário para Mestre depois da confirmação', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);
    const beto = (await screen.findByText('Beto Lima')).closest('article');
    expect(beto).toBeTruthy();
    await user.click(within(beto as HTMLElement).getByRole('button', { name: 'Mestre' }));
    expect(setAdminUserPlan).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Mudar plano' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Alterar o plano de Beto Lima para Mestre? A conta passa a usar as cotas e os recursos desse plano.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar plano' }));
    expect(setAdminUserPlan).toHaveBeenCalledWith('user-2', 'premium');
  });

  it('cancela a mudança de plano sem salvar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);
    const beto = (await screen.findByText('Beto Lima')).closest('article');
    expect(beto).toBeTruthy();
    await user.click(within(beto as HTMLElement).getByRole('button', { name: 'Mestre' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(setAdminUserPlan).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Mudar plano' })).not.toBeInTheDocument();
  });

  it('permite mudar o plano da conta inicial', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);
    const ana = (await screen.findByText('Ana Costa')).closest('article');
    expect(ana).toBeTruthy();
    await user.click(within(ana as HTMLElement).getByRole('button', { name: 'Capitão' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar plano' }));
    expect(setAdminUserPlan).toHaveBeenCalledWith('user-1', 'capitao');
  });

  it('pede confirmação antes de bloquear uma conta', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);
    const beto = (await screen.findByText('Beto Lima')).closest('article');
    expect(beto).toBeTruthy();
    await user.click(within(beto as HTMLElement).getByRole('button', { name: 'Bloquear' }));
    expect(setAdminUserActive).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Bloquear conta' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar bloqueio' }));
    expect(setAdminUserActive).toHaveBeenCalledWith('user-2', false);
  });
});
