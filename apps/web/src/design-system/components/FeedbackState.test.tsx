import { render, screen } from '@testing-library/react';
import { FeedbackState } from './FeedbackState';

describe('FeedbackState', () => {
  it('marca o estado de carregamento como ocupado', () => {
    render(<FeedbackState title="Lendo o mar" description="Organizando as janelas." busy />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Lendo o mar')).toBeInTheDocument();
  });

  it('não marca estados estáticos como ocupados', () => {
    render(<FeedbackState title="Sem previsão" description="Nenhuma condição encontrada." />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false');
  });
});
