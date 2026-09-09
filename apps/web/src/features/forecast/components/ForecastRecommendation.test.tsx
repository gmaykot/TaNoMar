import { render, screen } from '@testing-library/react';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { ForecastRecommendation } from './ForecastRecommendation';

describe('ForecastRecommendation', () => {
  it('não escolhe vencedor visual em empate nem repete notas nos horários', () => {
    const forecast = forecastFixture.days[0]?.ranking[0];
    if (!forecast) throw new Error('fixture de ranking ausente');
    render(
      <ForecastRecommendation
        forecast={{
          ...forecast,
          hourWindows: forecast.hourWindows.map((window) => ({ ...window, score: 9.1 })),
        }}
        variant="detail"
        dayLabel="Hoje · 05/09"
        showFishingScore
        selectedHour="05:30"
        onHourSelect={() => undefined}
      />,
    );

    expect(screen.queryByText('Melhor')).not.toBeInTheDocument();
    expect(screen.getByText('Hoje · 05/09')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Melhores horários para pescar' })).toBeInTheDocument();
    expect(screen.getAllByText('9,1')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Ver condições das 05h30, selecionado' }),
    ).toHaveTextContent('05h30');
  });

  it('repete a composição da Home: data e selo no topo, título e nota no centro', () => {
    const forecast = forecastFixture.days[0]?.ranking[0];
    if (!forecast) throw new Error('fixture de ranking ausente');
    render(
      <ForecastRecommendation
        forecast={{ ...forecast, score: 8.7, classification: 'excellent' }}
        variant="detail"
        dayLabel="Amanhã · 10/09"
        showFishingScore
        selectedHour="17:00"
        onHourSelect={() => undefined}
      />,
    );

    const date = screen.getByText('Amanhã · 10/09');
    const badge = screen.getByText('Excelente');
    const title = screen.getByRole('heading', { name: 'Melhores horários para pescar' });
    const score = screen.getByLabelText('Nota 8,7 de 10, Excelente');
    const hours = screen.getByRole('group', { name: 'Horários recomendados' });
    const explanation = screen.getByText('Entenda a nota');
    expect(screen.queryByText(/^Selecionado$/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Condição às/ })).not.toBeInTheDocument();
    expect(date.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(date.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.compareDocumentPosition(score) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.compareDocumentPosition(hours) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hours.compareDocumentPosition(explanation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver condições das 17h, selecionado' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Ver condições das 05h30' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
