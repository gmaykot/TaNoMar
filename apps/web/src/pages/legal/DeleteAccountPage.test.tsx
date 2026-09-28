import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { DeleteAccountPage } from './DeleteAccountPage';

const getAccountDeletionStatus = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/services/authService', () => ({
  getAccountDeletionStatus: (...args: unknown[]) => getAccountDeletionStatus(...args),
}));

describe('DeleteAccountPage', () => {
  beforeEach(() => getAccountDeletionStatus.mockReset());

  it('mostra os passos, o que some e leva à Conta', () => {
    renderWithProviders(<DeleteAccountPage />);

    expect(
      screen.getByRole('heading', { name: 'Como apagar sua conta no TáNoMar.' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Toque em Excluir conta/)).toBeInTheDocument();
    expect(screen.getByText(/período já pago acaba com a conta, sem estorno/)).toBeInTheDocument();
    expect(screen.getByText(/Candidatura de parceiro/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Política de privacidade' })).toHaveAttribute(
      'href',
      '/privacidade',
    );
    expect(screen.getByRole('link', { name: 'Abrir Conta' })).toHaveAttribute('href', '/conta');
  });

  it('consulta o protocolo da URL sem revelar dados da assinatura', async () => {
    getAccountDeletionStatus.mockResolvedValue({
      status: 'cancellation_pending',
      updatedAt: '2026-09-28T12:00:00Z',
      supportChannel: 'privacidade@tanomar.app',
    });

    renderWithProviders(<DeleteAccountPage />, [
      '/excluir-conta#protocolo=test-protocol-abcdefghijklmnopqrstuvwxyz123456',
    ]);

    expect(await screen.findByRole('status')).toHaveTextContent(/continua pendente/);
    expect(getAccountDeletionStatus).toHaveBeenCalledWith(
      'test-protocol-abcdefghijklmnopqrstuvwxyz123456',
    );
    expect(screen.queryByText(/AsaasSubscriptionId/)).not.toBeInTheDocument();
  });
});
