import { describe, expect, it } from 'vitest';
import { formatDecimal } from './formatNumber';

describe('formatDecimal', () => {
  it('formata com vírgula no padrão brasileiro', () => {
    expect(formatDecimal(9.8)).toBe('9,8');
    expect(formatDecimal(0.66, 2)).toBe('0,66');
  });
});
