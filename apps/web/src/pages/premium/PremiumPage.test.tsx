import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PremiumPage } from './PremiumPage';

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { plan: { code: 'free' } } }),
}));

describe('PremiumPage', () => {
  it('lista todos os recursos Premium disponíveis', () => {
    renderWithProviders(<PremiumPage />);

    expect(screen.getByRole('heading', { name: 'Previsão ampliada' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Leitura sob medida' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Seus locais e favoritos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alertas de oportunidade' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Diário de pesca' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Previsão offline' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Confirmação da comunidade' })).toBeInTheDocument();
  });
});
