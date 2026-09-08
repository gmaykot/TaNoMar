import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { RankingList } from './RankingList';

describe('RankingList', () => {
  it('não resume ondas bloqueadas no plano atual', () => {
    const item = forecastFixture.days[0]?.ranking[1];
    if (!item) throw new Error('fixture de ranking ausente');
    const metrics = item.metrics.map((metric) =>
      metric.key === 'waves' || metric.key === 'wave-period' || metric.key === 'swell'
        ? { ...metric, value: 'Assinatura', locked: true }
        : metric,
    );

    render(
      <MemoryRouter>
        <RankingList items={[{ ...item, metrics }]} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/^Vento /)).toBeInTheDocument();
    expect(screen.queryByText(/Ondas Assinatura/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Ondas /)).not.toBeInTheDocument();
  });
});
