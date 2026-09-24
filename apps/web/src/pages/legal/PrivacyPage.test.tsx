import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PrivacyPage } from './PrivacyPage';
import { privacyContactEmail } from './privacyContact';

describe('PrivacyPage', () => {
  it('explica os dados tratados e aponta a exclusão da conta', () => {
    renderWithProviders(<PrivacyPage />);

    expect(
      screen.getByRole('heading', { name: 'Como o TáNoMar trata seus dados.' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/identificador da conta Google/)).toBeInTheDocument();
    expect(screen.getByText(/não grava uma trilha da sua posição/)).toBeInTheDocument();
    expect(screen.getByText(/número do cartão permanece no Asaas/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(privacyContactEmail))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Excluir conta' })).toHaveAttribute(
      'href',
      '/excluir-conta',
    );
    expect(screen.getByRole('link', { name: 'Voltar à apresentação do TáNoMar' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
