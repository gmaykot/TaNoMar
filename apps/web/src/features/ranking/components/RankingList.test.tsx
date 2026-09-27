import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ForecastRankingItem } from '@/features/fishing/types/fishing';
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

  it('limita os locais conforme a cota e bloqueia o restante', () => {
    const base = forecastFixture.days[0]?.ranking[0];
    if (!base) throw new Error('fixture de ranking ausente');
    const items = Array.from({ length: 8 }, (_, index) => ({
      ...base,
      locationId: `local-${index}`,
      locationName: `Local ${index + 1}`,
    }));

    render(
      <MemoryRouter>
        <RankingList items={items} pageSize={rankingPageSize} maxItems={5} />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5);
    expect(
      screen.getByRole('button', { name: 'Mostrar mais. Disponível na assinatura.' }),
    ).toBeDisabled();
  });

  it('mostra confiança sem alterar a ordem por nota', () => {
    const base = forecastFixture.days[0]?.ranking[0];
    if (!base) throw new Error('fixture de ranking ausente');
    const items: ForecastRankingItem[] = [
      {
        ...base,
        locationId: 'alto-score',
        locationName: 'Local A',
        score: 9,
        classification: 'excellent' as const,
        quality: {
          ...base.quality!,
          confidence: { level: 'low' as const, reasons: ['sparse_hour_coverage'] as const },
        },
      },
      {
        ...base,
        locationId: 'baixa-nota',
        locationName: 'Local B',
        score: 8.5,
        classification: 'excellent' as const,
        quality: {
          ...base.quality!,
          confidence: { level: 'high' as const, reasons: [] as const },
        },
      },
    ];

    render(
      <MemoryRouter>
        <RankingList items={items} />
      </MemoryRouter>,
    );

    const headings = screen.getAllByRole('heading', { level: 3 }).map((item) => item.textContent);
    expect(headings).toEqual(['Local A', 'Local B']);
    expect(screen.getByLabelText('Nota 9,0 de 10, Excelente')).toBeInTheDocument();
    expect(screen.getByLabelText('Nota 8,5 de 10, Excelente')).toBeInTheDocument();
    expect(screen.getByText('Confiança baixa')).toBeInTheDocument();
    expect(screen.getByText('Confiança alta')).toBeInTheDocument();
  });
});
