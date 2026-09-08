import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PremiumPage } from './PremiumPage';

const { authState } = vi.hoisted(() => ({
  authState: {
    user: { plan: { code: 'free', name: 'Free' } } as { plan: { code: string; name: string } },
  },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

describe('PremiumPage', () => {
  beforeEach(() => {
    authState.user = { plan: { code: 'free', name: 'Free' } };
  });

  it('lista os três planos de assinatura e os recursos incluídos', () => {
    renderWithProviders(<PremiumPage />);

    expect(screen.getByRole('heading', { name: 'Arrais' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mestre' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Capitão' })).toBeInTheDocument();
    expect(screen.getByText('R$ 14,90')).toBeInTheDocument();
    expect(screen.getByText('R$ 19,90')).toBeInTheDocument();
    expect(screen.getByText('R$ 24,90')).toBeInTheDocument();
    expect(screen.getByText('Mais escolhido')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Previsão ampliada' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Leitura sob medida' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Seus locais e favoritos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alertas de oportunidade' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Diário de pesca' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Previsão offline' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Confirmação da comunidade' })).toBeInTheDocument();
  });

  it('marca o plano atual quando a conta já é assinante', () => {
    authState.user = { plan: { code: 'premium', name: 'Mestre' } };
    renderWithProviders(<PremiumPage />);

    expect(screen.getByText(/Você já é assinante · Mestre/)).toBeInTheDocument();
    expect(screen.getByText('Seu plano atual')).toBeInTheDocument();
  });
});
