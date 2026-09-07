import { describe, expect, it } from 'vitest';
import { formatWindMetric } from './formatWindMetric';

describe('formatWindMetric', () => {
  it('converte vento e rajadas para nós quando essa é a preferência', () => {
    expect(formatWindMetric({ key: 'wind', label: 'Vento', value: '18,5 km/h Sul' }, 'kt')).toBe(
      '10,0 nós Sul',
    );
    expect(formatWindMetric({ key: 'gusts', label: 'Rajadas', value: '37 km/h' }, 'kt')).toBe(
      '20,0 nós',
    );
  });

  it('preserva as demais métricas e a unidade km/h', () => {
    expect(formatWindMetric({ key: 'wind', label: 'Vento', value: '18 km/h Sul' }, 'kmh')).toBe(
      '18 km/h Sul',
    );
    expect(formatWindMetric({ key: 'rain', label: 'Chuva', value: '2 mm' }, 'kt')).toBe('2 mm');
  });
});
