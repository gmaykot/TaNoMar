import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminUsersPage } from './AdminUsersPage';

const { setAdminUserPlan, setAdminUserActive, setAdminUserRole } = vi.hoisted(() => ({
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
      canChangeRole: true,
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
      canChangeRole: true,
    }),
  ),
  setAdminUserRole: vi.fn(() =>
    Promise.resolve({
      id: 'user-3',
      name: 'Cida Souza',
      email: 'cida@example.com',
      pictureUrl: null,
      role: 'User',
      isActive: true,
      plan: { code: 'premium', name: 'Mestre' },
      createdAt: '2026-09-03T12:00:00+00:00',
      isSelf: false,
      protection: null,
      canChangePlan: true,
      canDeactivate: true,
      canChangeRole: true,
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
        canChangeRole: false,
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
        canChangeRole: true,
      },
      {
        id: 'user-3',
        name: 'Cida Souza',
        email: 'cida@example.com',
        pictureUrl: null,
        role: 'Admin',
        isActive: true,
        plan: { code: 'premium', name: 'Mestre' },
        createdAt: '2026-09-03T12:00:00+00:00',
        isSelf: false,
        protection: null,
        canChangePlan: true,
        canDeactivate: true,
        canChangeRole: true,
      },
    ]),
  setAdminUserPlan,
  setAdminUserActive,
  setAdminUserRole,
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: 'user-1' },
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

async function openAccountMenu(user: ReturnType<typeof userEvent.setup>, name: string) {
  const row = (await screen.findByText(name)).closest('article');
  expect(row).toBeTruthy();
  await user.click(
    within(row as HTMLElement).getByRole('button', { name: `Ações da conta de ${name}` }),
  );
  return row as HTMLElement;
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    setAdminUserPlan.mockClear();
    setAdminUserActive.mockClear();
    setAdminUserRole.mockClear();
  });

  it('lista contas e filtra por nome sem acento', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);

    expect(await screen.findByText('3 contas encontradas')).toBeInTheDocument();
    expect(screen.getByText('Ana Costa')).toBeInTheDocument();
    expect(screen.getByText('Conta inicial')).toBeInTheDocument();
    expect(screen.getByText('Beto Lima')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar usuários' }), 'beto');
    expect(screen.getByText('1 conta encontrada')).toBeInTheDocument();
    expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument();
  });

  it('esconde bloqueio, plano e cargo no menu de três pontinhos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);
    const beto = (await screen.findByText('Beto Lima')).closest('article');
    expect(beto).toBeTruthy();

    expect(
      within(beto as HTMLElement).queryByRole('button', { name: 'Bloquear' }),
    ).not.toBeInTheDocument();
    expect(
      within(beto as HTMLElement).queryByRole('menuitem', { name: 'Plano Mestre' }),
    ).not.toBeInTheDocument();
    expect(
      within(beto as HTMLElement).getByRole('button', { name: 'Ações da conta de Beto Lima' }),
    ).toBeInTheDocument();

    await user.click(
      within(beto as HTMLElement).getByRole('button', { name: 'Ações da conta de Beto Lima' }),
    );
    expect(screen.getByRole('menu', { name: 'Ações de Beto Lima' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Tornar admin' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Bloquear' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Plano Mestre' })).toBeInTheDocument();
  });

  it('promove um usuário para Mestre depois da confirmação', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);
    await openAccountMenu(user, 'Beto Lima');
    await user.click(screen.getByRole('menuitem', { name: 'Plano Mestre' }));
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
    await openAccountMenu(user, 'Beto Lima');
    await user.click(screen.getByRole('menuitem', { name: 'Plano Mestre' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(setAdminUserPlan).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Mudar plano' })).not.toBeInTheDocument();
  });

  it('permite mudar o plano da conta inicial', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);
    await openAccountMenu(user, 'Ana Costa');
    await user.click(screen.getByRole('menuitem', { name: 'Plano Capitão' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar plano' }));
    expect(setAdminUserPlan).toHaveBeenCalledWith('user-1', 'capitao');
  });

  it('pede confirmação antes de bloquear uma conta', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);
    await openAccountMenu(user, 'Beto Lima');
    await user.click(screen.getByRole('menuitem', { name: 'Bloquear' }));
    expect(setAdminUserActive).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Bloquear conta' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar bloqueio' }));
    expect(setAdminUserActive).toHaveBeenCalledWith('user-2', false);
  });

  it('rebaixa outro admin depois da confirmação', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);
    await openAccountMenu(user, 'Cida Souza');
    await user.click(screen.getByRole('menuitem', { name: 'Rebaixar' }));
    expect(setAdminUserRole).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Rebaixar admin' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar rebaixamento' }));
    expect(setAdminUserRole).toHaveBeenCalledWith('user-3', 'User');
  });

  it('promove um usuário a admin depois da confirmação', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);
    await openAccountMenu(user, 'Beto Lima');
    await user.click(screen.getByRole('menuitem', { name: 'Tornar admin' }));
    expect(setAdminUserRole).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Tornar admin' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar cargo' }));
    expect(setAdminUserRole).toHaveBeenCalledWith('user-2', 'Admin');
  });

  it('mostra rebaixar desabilitado na própria conta inicial', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);
    await openAccountMenu(user, 'Ana Costa');
    expect(screen.getByRole('menuitem', { name: 'Rebaixar' })).toBeDisabled();
    await user.click(screen.getByRole('menuitem', { name: 'Rebaixar' }));
    expect(setAdminUserRole).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Rebaixar admin' })).not.toBeInTheDocument();
  });
});
