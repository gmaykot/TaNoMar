import { render, screen } from '@testing-library/react';
import { ScoreIndicator } from './ScoreIndicator';

describe('ScoreIndicator', () => {
  it('expõe nota e classificação em texto acessível', () => {
    render(<ScoreIndicator score={9.1} classification="excellent" />);
    expect(screen.getByLabelText('Nota 9.1 de 10, Excelente')).toBeInTheDocument();
  });
});
