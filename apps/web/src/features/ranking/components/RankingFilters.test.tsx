import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

    expect(screen.getByRole('group', { name: 'Tipo' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Região' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Exposição' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lagoa' }));
    expect(onFiltersChange).toHaveBeenCalledWith({
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
        filters={{ types: ['praia'], regions: ['sul'], profiles: [] }}
        onFiltersChange={() => undefined}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Filtros avançados, 2 filtros aplicados' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
