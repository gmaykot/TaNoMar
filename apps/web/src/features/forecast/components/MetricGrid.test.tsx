import { render, screen } from '@testing-library/react';
import type { FishingMetric } from '@/features/fishing/types/fishing';
import { MetricGrid } from './MetricGrid';

const metrics: FishingMetric[] = [
  { key: 'wind', label: 'Vento', value: '7 km/h' },
  { key: 'gusts', label: 'Rajadas', value: '14 km/h' },
  { key: 'waves', label: 'Ondas', value: '0,7 m' },
  { key: 'wave-period', label: 'Período', value: '8 s' },
  { key: 'swell', label: 'Swell', value: '0,5 m' },
  { key: 'rain', label: 'Chuva', value: '8%' },
  { key: 'water-temperature', label: 'Água', value: '20 °C', locked: true },
];

describe('MetricGrid', () => {
  it('não mistura o período no tile de ondas quando o período está oculto', () => {
    render(<MetricGrid metrics={metrics} keys={['waves']} compact />);

    expect(screen.getByText('Ondas')).toBeInTheDocument();
    expect(screen.queryByText(/Período:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Período')).not.toBeInTheDocument();
  });

  it('esconde métricas bloqueadas quando hideLocked está ligado', () => {
    render(<MetricGrid metrics={metrics} compact hideLocked />);

    expect(screen.getByText('Ondas')).toBeInTheDocument();
    expect(screen.queryByText('Água')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Água bloqueado no plano atual')).not.toBeInTheDocument();
  });

  it('mostra rajadas no grid quando o mar bloqueado deixa só as condições do Free', () => {
    const freeMetrics: FishingMetric[] = [
      { key: 'wind', label: 'Vento', value: '5,3 km/h' },
      { key: 'gusts', label: 'Rajadas', value: '12,6 km/h' },
      { key: 'waves', label: 'Ondas', value: 'Assinatura', locked: true },
      { key: 'wave-period', label: 'Período', value: 'Assinatura', locked: true },
      { key: 'swell', label: 'Swell', value: 'Assinatura', locked: true },
      { key: 'rain', label: 'Chuva', value: '0 mm (9%)' },
      { key: 'air-temperature', label: 'Temperatura', value: '12 °C', detail: 'Ar' },
      { key: 'water-temperature', label: 'Água', value: 'Assinatura', locked: true },
    ];

    render(
      <MetricGrid
        metrics={freeMetrics}
        keys={['wind', 'gusts', 'waves', 'rain', 'air-temperature', 'water-temperature']}
        compact
        hideLocked
      />,
    );

    expect(screen.getByText('Vento')).toBeInTheDocument();
    expect(screen.getByText('Rajadas')).toBeInTheDocument();
    expect(screen.queryByText(/Rajadas:/)).not.toBeInTheDocument();
    expect(screen.getByText('Chuva')).toBeInTheDocument();
    expect(screen.getByText('Temperatura')).toBeInTheDocument();
  });

  it('mantém o cadeado no detalhe quando hideLocked está desligado', () => {
    render(<MetricGrid metrics={metrics} />);

    expect(screen.getByLabelText('Água bloqueado no plano atual')).toBeInTheDocument();
  });
});
