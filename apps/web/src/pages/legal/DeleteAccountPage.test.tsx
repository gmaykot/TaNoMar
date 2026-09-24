import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { DeleteAccountPage } from './DeleteAccountPage';

describe('DeleteAccountPage', () => {
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
});
