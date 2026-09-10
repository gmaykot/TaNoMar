import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyRankingSpotFilters } from '../rankingSpotFilters';
import { RankingFilters } from './RankingFilters';

describe('RankingFilters', () => {
  it('abre as opções de tipo, região e exposição no ícone ao lado da ênfase', async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <RankingFilters
        emphasis="score"
        premium
        onEmphasisChange={() => undefined}
        filters={emptyRankingSpotFilters}
        onFiltersChange={onFiltersChange}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Praia' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Filtros avançados' }));

    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Região')).toBeInTheDocument();
    expect(screen.getByText('Exposição')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Filtrar por descrição' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Notas acima de' })).toBeInTheDocument();
    await user.click(screen.getByText('Tipo'));
    await user.click(screen.getByRole('checkbox', { name: 'Lagoa' }));
    expect(onFiltersChange).toHaveBeenCalledWith({
      description: '',
      minimumScore: null,
      types: ['lagoa'],
      regions: [],
      profiles: [],
    });
  });

  it('marca o ícone quando há filtro aplicado', () => {
    render(
      <RankingFilters
        emphasis="score"
        premium
        onEmphasisChange={() => undefined}
        filters={{
          description: '',
          minimumScore: null,
          types: ['praia'],
          regions: ['sul'],
          profiles: [],
        }}
        onFiltersChange={() => undefined}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Filtros avançados, 2 filtros aplicados' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('altera a descrição e a nota mínima', async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <RankingFilters
        emphasis="score"
        premium
        onEmphasisChange={() => undefined}
        filters={emptyRankingSpotFilters}
        onFiltersChange={onFiltersChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Filtros avançados' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Filtrar por descrição' }), {
      target: { value: 'costão' },
    });
    expect(onFiltersChange).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(onFiltersChange).toHaveBeenCalledWith({
        ...emptyRankingSpotFilters,
        description: 'costão',
      });
    });

    fireEvent.change(screen.getByRole('slider', { name: 'Notas acima de' }), {
      target: { value: '8' },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...emptyRankingSpotFilters,
      description: 'costão',
      minimumScore: 8,
    });
  });
});
