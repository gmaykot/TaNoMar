import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { ForecastHero } from './ForecastHero';

describe('ForecastHero', () => {
  it('mostra o selo Meu local quando o destaque é do usuário', () => {
    const forecast = forecastFixture.days[0]?.ranking[0];
    if (!forecast) throw new Error('fixture de ranking ausente');

    render(
      <MemoryRouter>
        <ForecastHero forecast={{ ...forecast, isOwner: true, visibility: 'shared' }} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Meu local')).toBeInTheDocument();
    expect(screen.queryByText('Compartilhado')).not.toBeInTheDocument();
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
    expect(screen.queryByText('Compartilhado')).not.toBeInTheDocument();
  });

  it('mostra o selo Compartilhado quando o destaque é da comunidade', () => {
    const forecast = forecastFixture.days[0]?.ranking[0];
    if (!forecast) throw new Error('fixture de ranking ausente');

    render(
      <MemoryRouter>
        <ForecastHero forecast={{ ...forecast, isOwner: false, visibility: 'shared' }} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Compartilhado')).toBeInTheDocument();
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
    expect(screen.queryByText(/Melhor horário/)).not.toBeInTheDocument();
    expect(screen.getByText(/Destaque/)).toBeInTheDocument();
  });

  it('mostra a recomendação compacta, condições e série de notas', async () => {
    const forecast = forecastFixture.days[0]?.ranking[0];
    if (!forecast) throw new Error('fixture de ranking ausente');

    const metrics = forecast.metrics.map((metric) => {
      if (metric.key === 'wind') return { ...metric, value: '5,3 km/h Sudoeste' };
      if (metric.key === 'gusts') return { ...metric, value: '12,6 km/h' };
      if (metric.key === 'waves') return { ...metric, value: '0,66 m' };
      if (metric.key === 'wave-period') return { ...metric, value: '8 s' };
      if (metric.key === 'rain') return { ...metric, value: '0 mm (9%)' };
      if (metric.key === 'air-temperature') return { ...metric, value: '12 °C' };
      if (metric.key === 'water-temperature') return { ...metric, value: '18,4 °C' };
      return metric;
    });

    render(
      <MemoryRouter>
        <ForecastHero
          forecast={{ ...forecast, metrics, hourWindows: [...forecast.hourWindows].reverse() }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Melhor horário/)).toBeInTheDocument();
    expect(screen.getAllByText('05h30')).toHaveLength(2);
    expect(screen.getByText(/Outros horários: 07h e 17h/)).toBeInTheDocument();
    expect(screen.getByText('Condições às 05h30')).toBeInTheDocument();
    expect(screen.getByText(/Rajadas:/)).toHaveTextContent(/Rajadas: 12,6 km\/h/);
    expect(screen.getByText(/Período:/)).toHaveTextContent(/Período: 8 s/);
    expect(screen.getByText('9% de chance')).toBeInTheDocument();
    expect(screen.getByText(/Volume:/)).toHaveTextContent(/Volume: 0 mm/);
    expect(screen.getByText('Temperatura')).toBeInTheDocument();
    expect(screen.getByText(/18,4/)).toHaveTextContent(/18,4 °C/);
    expect(screen.queryByRole('img', { name: /Evolução das notas/ })).not.toBeInTheDocument();
    const trend = screen.getByRole('region', { name: 'Notas dos melhores horários' });
    expect(
      within(trend)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['05h309,1', '07h8,9', '17h8,7']);
    expect(screen.getAllByText('9,1')).toHaveLength(2);
    const infoButton = screen.getByLabelText('Como a nota é calculada');
    const details = infoButton.closest('details');
    const user = userEvent.setup();
    expect(details).not.toHaveAttribute('open');
    await user.click(infoButton);
    expect(details).toHaveAttribute('open');
    expect(within(details!).getByText(/média das 3 melhores horas/)).toBeInTheDocument();
    await user.click(infoButton);
    infoButton.focus();
    expect(infoButton.tagName).toBe('SUMMARY');
    expect(infoButton).toHaveFocus();
  });

  it('não mostra o período no tile de ondas quando o período está oculto', () => {
    const forecast = forecastFixture.days[0]?.ranking[0];
    if (!forecast) throw new Error('fixture de ranking ausente');

    render(
      <MemoryRouter>
        <ForecastHero forecast={forecast} visibleMetricKeys={['waves', 'wind']} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Ondas')).toBeInTheDocument();
    expect(screen.queryByText(/Período:/)).not.toBeInTheDocument();
  });

  it('esconde indicadores de mar bloqueados no card compacto', () => {
    const forecast = forecastFixture.days[0]?.ranking[0];
    if (!forecast) throw new Error('fixture de ranking ausente');
    const metrics = forecast.metrics.map((metric) =>
      metric.key === 'waves' ||
      metric.key === 'wave-period' ||
      metric.key === 'swell' ||
      metric.key === 'water-temperature'
        ? { ...metric, value: 'Assinatura', locked: true }
        : metric,
    );

    render(
      <MemoryRouter>
        <ForecastHero forecast={{ ...forecast, metrics }} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Vento')).toBeInTheDocument();
    expect(screen.getByText('Rajadas')).toBeInTheDocument();
    expect(screen.queryByText(/Rajadas:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Ondas')).not.toBeInTheDocument();
    expect(screen.queryByText('Assinatura')).not.toBeInTheDocument();
  });
});
