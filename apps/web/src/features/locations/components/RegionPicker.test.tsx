import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RegionPicker } from './RegionPicker';

describe('RegionPicker', () => {
  it('mostra a ilha e troca a região ao tocar um setor', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<RegionPicker value="Florianópolis" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Toda a ilha' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Sul da ilha' }));
    expect(onChange).toHaveBeenCalledWith('Sul da ilha');
  });

  it('acumula setores na preferência da conta', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<RegionPicker multiple value={['Sul da ilha']} onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Sul da ilha' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Toda a ilha' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await user.click(screen.getByRole('button', { name: 'Leste da ilha' }));
    expect(onChange).toHaveBeenCalledWith(['Sul da ilha', 'Leste da ilha']);
  });
});
