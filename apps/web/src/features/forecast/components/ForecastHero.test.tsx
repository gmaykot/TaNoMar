import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { ForecastHero } from './ForecastHero';

describe('ForecastHero', () => {
  it('mostra o selo Meu local quando o destaque é do usuário', () => {
    const forecast = forecastFixture.days[0]?.ranking[0];
    if (!forecast) throw new Error('fixture de ranking ausente');

    render(
      <MemoryRouter>
        <ForecastHero forecast={{ ...forecast, isOwner: true }} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Meu local')).toBeInTheDocument();
  });

  it('omite o selo quando o destaque não é do usuário', () => {
    const forecast = forecastFixture.days[0]?.ranking[0];
    if (!forecast) throw new Error('fixture de ranking ausente');

    render(
      <MemoryRouter>
        <ForecastHero forecast={forecast} />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Meu local')).not.toBeInTheDocument();
  });

  it('omite a nota quando o foco não é de pesca', () => {
    const forecast = forecastFixture.days[0]?.ranking[0];
    if (!forecast) throw new Error('fixture de ranking ausente');

    render(
      <MemoryRouter>
        <ForecastHero forecast={forecast} showFishingScore={false} />
      </MemoryRouter>,
    );

    expect(screen.queryByLabelText(/Nota /)).not.toBeInTheDocument();
    expect(screen.queryByText(/Melhor hora/)).not.toBeInTheDocument();
    expect(screen.getByText(/Destaque/)).toBeInTheDocument();
  });

  it('mostra a média das horas e a origem das métricas', () => {
    const forecast = forecastFixture.days[0]?.ranking[0];
    if (!forecast) throw new Error('fixture de ranking ausente');

    render(
      <MemoryRouter>
        <ForecastHero forecast={forecast} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Média das 3 melhores horas/)).toBeInTheDocument();
    expect(screen.getByText('Condições às 05:30')).toBeInTheDocument();
    expect(screen.getByText(/Melhor hora/)).toBeInTheDocument();
  });
});
