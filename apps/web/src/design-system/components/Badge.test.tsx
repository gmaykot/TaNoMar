import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it.each([
    ['excellent', 'Excelente'],
    ['very-good', 'Muito bom'],
    ['regular', 'Regular'],
    ['difficult', 'Difícil'],
  ] as const)('mostra o rótulo padronizado de %s', (classification, label) => {
    render(<Badge classification={classification} />);
    expect(screen.getByText(label)).toHaveAttribute('data-classification', classification);
  });
});
