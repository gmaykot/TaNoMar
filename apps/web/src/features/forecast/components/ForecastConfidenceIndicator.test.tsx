import { render, screen } from '@testing-library/react';
import { forecastQualityFixture } from '@/features/forecast/fixtures/forecast';
import { ForecastConfidenceIndicator } from './ForecastConfidenceIndicator';

describe('ForecastConfidenceIndicator', () => {
  it('mostra Confiança alta', () => {
    render(<ForecastConfidenceIndicator quality={forecastQualityFixture} />);
    expect(screen.getByText('Confiança alta')).toBeInTheDocument();
  });

  it('mostra Confiança média', () => {
    render(
      <ForecastConfidenceIndicator
        quality={{
          ...forecastQualityFixture,
          confidence: { level: 'medium', reasons: ['limited_hour_coverage'] },
        }}
      />,
    );
    expect(screen.getByText('Confiança média')).toBeInTheDocument();
  });

  it('mostra Confiança baixa', () => {
    render(
      <ForecastConfidenceIndicator
        quality={{
          ...forecastQualityFixture,
          confidence: { level: 'low', reasons: ['sparse_hour_coverage'] },
        }}
      />,
    );
    expect(screen.getByText('Confiança baixa')).toBeInTheDocument();
  });

  it('detalha cobertura e reasons humanas', () => {
    render(
      <ForecastConfidenceIndicator
        variant="detail"
        quality={{
          ...forecastQualityFixture,
          dataCompleteness: { validHours: 4, expectedHours: 16, ratio: 0.25 },
          confidence: {
            level: 'low',
            reasons: ['sparse_hour_coverage', 'stale_snapshot'],
          },
        }}
      />,
    );

    expect(screen.getByText('Confiança baixa')).toBeInTheDocument();
    expect(screen.getByText('4 de 16 horários com dados completos')).toBeInTheDocument();
    expect(screen.getByText('Poucos horários possuem dados completos.')).toBeInTheDocument();
    expect(
      screen.getByText('A previsão está usando dados mais antigos que o normal.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('sparse_hour_coverage')).not.toBeInTheDocument();
  });

  it('mostra a idade meteorológica no compacto offline a partir de dataUpdatedAt', () => {
    render(
      <ForecastConfidenceIndicator
        source="offline"
        now={new Date('2026-09-07T12:00:00-03:00')}
        quality={{
          ...forecastQualityFixture,
          dataUpdatedAt: '2026-09-07T10:00:00-03:00',
          evaluatedAt: '2026-09-01T08:00:00-03:00',
        }}
      />,
    );

    expect(screen.getByText('Confiança na última atualização: Alta')).toBeInTheDocument();
    expect(screen.getByText('Dados atualizados há 2 horas')).toBeInTheDocument();
    expect(screen.queryByText('Dados atualizados há 6 dias')).not.toBeInTheDocument();
  });

  it('não mostra idade no compacto ao vivo', () => {
    render(<ForecastConfidenceIndicator quality={forecastQualityFixture} />);
    expect(screen.getByText('Confiança alta')).toBeInTheDocument();
    expect(screen.queryByText(/Dados atualizados há/)).not.toBeInTheDocument();
  });

  it('usa linguagem histórica no modo offline', () => {
    render(
      <ForecastConfidenceIndicator
        variant="detail"
        source="offline"
        now={new Date('2026-09-07T08:00:00-03:00')}
        quality={forecastQualityFixture}
      />,
    );

    expect(screen.getByText('Confiança na última atualização: Alta')).toBeInTheDocument();
    expect(screen.getByText('Dados atualizados há 2 dias')).toBeInTheDocument();
  });
});
