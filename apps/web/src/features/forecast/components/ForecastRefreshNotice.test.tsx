import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ForecastRefreshNotice } from './ForecastRefreshNotice';

describe('ForecastRefreshNotice', () => {
  it('informa a atualização sem esconder os dados disponíveis', () => {
    render(
      <ForecastRefreshNotice
        refresh={{
          state: 'updating',
          dataUpdatedAt: '2026-09-10T10:00:00Z',
          pendingSpotIds: ['campeche'],
          failedSpotIds: [],
        }}
      />,
    );

    expect(screen.getByText('Atualizando locais')).toBeInTheDocument();
    expect(screen.getByText(/dados disponíveis/)).toBeInTheDocument();
  });

  it('não ocupa espaço quando os dados estão atualizados', () => {
    const { container } = render(
      <ForecastRefreshNotice
        refresh={{
          state: 'fresh',
          dataUpdatedAt: '2026-09-10T10:00:00Z',
          pendingSpotIds: [],
          failedSpotIds: [],
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
