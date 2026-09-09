import { fireEvent, render, screen } from '@testing-library/react';
import { ForecastChart } from './ForecastChart';

describe('ForecastChart', () => {
  it('expõe eixos, unidade, seleção, resumo e valores acessíveis', () => {
    render(
      <ForecastChart
        label="Vento ao longo do dia"
        unit="km/h"
        selectedHour="07:00"
        points={[
          { time: '05:00', value: 7 },
          { time: '07:00', value: 12 },
          { time: '17:00', value: 9 },
        ]}
      />,
    );

    expect(screen.getByRole('img', { name: 'Vento ao longo do dia' })).toBeInTheDocument();
    expect(screen.getByText('km/h')).toBeInTheDocument();
    expect(screen.getByText('seleção')).toBeInTheDocument();
    expect(screen.getByText('Mín. 7 km/h · Máx. 12 km/h')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '07h, 12 km/h' })).toBeInTheDocument();
  });

  it('mostra o valor ao tocar num ponto', () => {
    render(
      <ForecastChart
        label="Ondas ao longo do dia"
        unit="m"
        points={[
          { time: '05:00', value: 0.7 },
          { time: '17:00', value: 1.2 },
        ]}
        tone="waves"
      />,
    );
    fireEvent.pointerDown(screen.getByRole('button', { name: '17h, 1,2 m' }));
    expect(screen.getByText('17h · 1,2 m')).toBeInTheDocument();
  });
});
