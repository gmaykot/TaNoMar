import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { ForecastPresentation } from './ForecastPresentation';

function renderSummary(overrides = {}) {
  const forecast = forecastFixture.days[0]?.ranking[0];
  if (!forecast) throw new Error('fixture de ranking ausente');
  render(
    <MemoryRouter>
      <ForecastPresentation
        variant="summary"
        forecast={{ ...forecast, ...overrides }}
        date="2026-09-05"
        dayLabel="Hoje"
      />
    </MemoryRouter>,
  );
}

describe('ForecastPresentation summary', () => {
  it('resume local, data, nota, horário e três condições', () => {
    renderSummary();

    const card = screen.getByRole('heading', { name: 'Pântano do Sul' }).closest('article');
    expect(card).toBeTruthy();
    if (!card) return;
    expect(within(card).getByText('Hoje · 05/09')).toBeInTheDocument();
    expect(within(card).getByText('Melhor escolha')).toBeInTheDocument();
    expect(within(card).getByLabelText(/Nota 9,1 de 10/)).toBeInTheDocument();
    expect(within(card).getByText('05h30')).toBeInTheDocument();
    expect(within(card).getByText('Condições às 05h30')).toBeInTheDocument();
    expect(within(card).getByText('Vento')).toBeInTheDocument();
    expect(within(card).getByText('Ondas')).toBeInTheDocument();
    expect(within(card).getByText('Chuva')).toBeInTheDocument();
    expect(within(card).queryByText('Pressão')).not.toBeInTheDocument();
    expect(within(card).queryByRole('img', { name: /ao longo do dia/ })).not.toBeInTheDocument();
  });

  it('preserva a data no link para a previsão completa', () => {
    renderSummary();
    expect(screen.getByRole('link', { name: /Ver previsão completa/ })).toHaveAttribute(
      'href',
      '/locais/pantano_do_sul?data=2026-09-05',
    );
  });

  it('preserva o selo de propriedade', () => {
    renderSummary({ isOwner: true, visibility: 'shared' });
    expect(screen.getByText('Meu local')).toBeInTheDocument();
    expect(screen.queryByText('Compartilhado')).not.toBeInTheDocument();
  });

  it('mantém a condição bloqueada visível no plano atual', () => {
    const forecast = forecastFixture.days[0]?.ranking[0];
    if (!forecast) throw new Error('fixture de ranking ausente');
    renderSummary({
      metrics: forecast.metrics.map((metric) =>
        metric.key === 'waves' || metric.key === 'wave-period'
          ? { ...metric, value: 'Assinatura', locked: true }
          : metric,
      ),
    });

    expect(screen.getByLabelText('Ondas bloqueado no plano atual')).toBeInTheDocument();
  });

  it('omite recomendação e nota quando o foco não é pesca', () => {
    const forecast = forecastFixture.days[0]?.ranking[0];
    if (!forecast) throw new Error('fixture de ranking ausente');
    render(
      <MemoryRouter>
        <ForecastPresentation
          variant="summary"
          forecast={forecast}
          date="2026-09-05"
          dayLabel="Hoje"
          showFishingScore={false}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByLabelText(/Nota /)).not.toBeInTheDocument();
    expect(screen.queryByText(/Melhor horário/)).not.toBeInTheDocument();
    expect(screen.getByText('Hoje · 05/09')).toBeInTheDocument();
    expect(screen.getByText('Destaque')).toBeInTheDocument();
    expect(screen.queryByText('Melhor escolha')).not.toBeInTheDocument();
  });
});
