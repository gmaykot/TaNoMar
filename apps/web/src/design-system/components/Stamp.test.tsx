import { render, screen } from '@testing-library/react';
import { Shield } from 'lucide-react';
import { Stamp } from './Stamp';

describe('Stamp', () => {
  it('mostra o rótulo do carimbo', () => {
    render(
      <Stamp tone="ocean" icon={Shield}>
        Conta inicial
      </Stamp>,
    );
    expect(screen.getByText('Conta inicial')).toBeInTheDocument();
  });
});
