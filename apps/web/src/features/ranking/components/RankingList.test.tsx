import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { RankingList, rankingPageSize } from './RankingList';

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

  it('mostra 10 locais e carrega o restante de 10 em 10', async () => {
    const user = userEvent.setup();
    const base = forecastFixture.days[0]?.ranking[0];
    if (!base) throw new Error('fixture de ranking ausente');
    const items = Array.from({ length: 25 }, (_, index) => ({
      ...base,
      locationId: `local-${index}`,
      locationName: `Local ${index + 1}`,
    }));

    render(
      <MemoryRouter>
        <RankingList items={items} pageSize={rankingPageSize} />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(10);
    expect(screen.queryByRole('heading', { name: 'Local 11' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mostrar mais' }));
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(20);
    expect(screen.getByRole('heading', { name: 'Local 11' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Local 21' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mostrar mais' }));
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(25);
    expect(screen.getByRole('heading', { name: 'Local 21' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mostrar mais' })).not.toBeInTheDocument();
  });

  it('não pagina o recorte da home', () => {
    const items = forecastFixture.days[0]?.ranking.slice(1) ?? [];
    render(
      <MemoryRouter>
        <RankingList items={items} limit={3} startAt={2} />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Mostrar mais' })).not.toBeInTheDocument();
  });
});
