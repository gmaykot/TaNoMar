import { describe, expect, it } from 'vitest';
import {
  cycleRankingEmphasis,
  parseRankingEmphasis,
  rankingEmphasisControlLabel,
  rankingEmphasisDirection,
  rankingEmphasisMetric,
  rankingEmphasisMetricKey,
  rankingEmphasisParam,
  rankingEmphasisQueryValue,
  rankingMetricKeys,
} from './rankingEmphasis';

describe('rankingEmphasis', () => {
  it('lê a ênfase da URL e ignora qualquer ênfase no plano Free', () => {
    expect(parseRankingEmphasis(null, true)).toBe('score');
    expect(parseRankingEmphasis('vento', true)).toBe('wind');
    expect(parseRankingEmphasis('mais-vento', true)).toBe('wind-more');
    expect(parseRankingEmphasis('chuva', true)).toBe('rain');
    expect(parseRankingEmphasis('mais-chuva', true)).toBe('rain-more');
    expect(parseRankingEmphasis('ondas', true)).toBe('waves');
    expect(parseRankingEmphasis('menos-ondas', true)).toBe('waves-less');
    expect(parseRankingEmphasis('vento', false)).toBe('score');
    expect(parseRankingEmphasis('chuva', false)).toBe('score');
    expect(parseRankingEmphasis('ondas', false)).toBe('score');
    expect(parseRankingEmphasis('menos-ondas', false)).toBe('score');
    expect(parseRankingEmphasis('desconhecida', true)).toBe('score');
  });

  it('mapeia ênfase para query da API e da UI', () => {
    expect(rankingEmphasisParam('score')).toBeUndefined();
    expect(rankingEmphasisParam('wind')).toBe('wind');
    expect(rankingEmphasisParam('wind-more')).toBe('wind-more');
    expect(rankingEmphasisQueryValue('score')).toBeNull();
    expect(rankingEmphasisQueryValue('waves')).toBe('ondas');
    expect(rankingEmphasisQueryValue('waves-less')).toBe('menos-ondas');
    expect(rankingEmphasisMetricKey('rain')).toBe('rain');
    expect(rankingEmphasisMetricKey('rain-more')).toBe('rain');
    expect(rankingEmphasisMetric('waves-less')).toBe('waves');
    expect(rankingEmphasisDirection('wind')).toBe('less');
    expect(rankingEmphasisDirection('waves')).toBe('more');
  });

  it('cicla a ênfase entre o padrão da métrica, o inverso e o ranking por nota', () => {
    expect(cycleRankingEmphasis('score', 'wind')).toBe('wind');
    expect(cycleRankingEmphasis('wind', 'wind')).toBe('wind-more');
    expect(cycleRankingEmphasis('wind-more', 'wind')).toBe('score');
    expect(cycleRankingEmphasis('rain', 'waves')).toBe('waves');
    expect(cycleRankingEmphasis('waves', 'waves')).toBe('waves-less');
    expect(cycleRankingEmphasis('waves-less', 'waves')).toBe('score');
  });

  it('descreve o próximo toque do controle', () => {
    expect(rankingEmphasisControlLabel('wind', 'score')).toBe(
      'Vento. Toque para ordenar com menos vento.',
    );
    expect(rankingEmphasisControlLabel('wind', 'wind')).toBe(
      'Menos vento. Toque para ordenar com mais vento.',
    );
    expect(rankingEmphasisControlLabel('wind', 'wind-more')).toBe(
      'Mais vento. Toque para remover a ênfase.',
    );
    expect(rankingEmphasisControlLabel('waves', 'score', true)).toBe(
      'Ondas, disponível no Premium',
    );
  });

  it('coloca a métrica enfatizada na frente da grade', () => {
    expect(rankingMetricKeys()).toBeUndefined();
    expect(rankingMetricKeys('waves')?.[0]).toBe('waves');
    expect(rankingMetricKeys('waves')).toContain('wind');
  });
});
