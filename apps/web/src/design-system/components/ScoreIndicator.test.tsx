import { render, screen } from '@testing-library/react';
import { ScoreIndicator } from './ScoreIndicator';

describe('ScoreIndicator', () => {
  it('expõe nota e classificação em texto acessível', () => {
    render(<ScoreIndicator score={9.1} classification="excellent" />);
    expect(screen.getByLabelText('Nota 9,1 de 10, Excelente')).toBeInTheDocument();
  });

  it('preserva score real igual a zero', () => {
    render(<ScoreIndicator score={0} classification="difficult" />);
    expect(screen.getByText('0,0')).toBeInTheDocument();
    expect(screen.getByLabelText('Nota 0,0 de 10, Difícil')).toBeInTheDocument();
  });

  it('mostra estado neutro sem score', () => {
    render(<ScoreIndicator score={null} />);
    expect(screen.getByLabelText('Previsão indisponível')).toBeInTheDocument();
    expect(screen.queryByText('Difícil')).not.toBeInTheDocument();
  });
});
