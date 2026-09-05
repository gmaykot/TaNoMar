import { describe, expect, it } from 'vitest';
import { formatDateTime, isSameCalendarDay } from './formatDateTime';

describe('formatDateTime', () => {
  it('formata data e hora no fuso de São Paulo', () => {
    expect(formatDateTime('2026-09-05T12:00:00Z')).toMatch(/05\/09/);
    expect(formatDateTime('2026-09-05T12:00:00Z')).toMatch(/09:00/);
  });

  it('reconhece o mesmo dia civil em São Paulo', () => {
    expect(isSameCalendarDay('2026-09-05T12:00:00Z', new Date('2026-09-05T18:00:00Z'))).toBe(true);
    expect(isSameCalendarDay('2026-09-05T12:00:00Z', new Date('2026-09-06T12:00:00Z'))).toBe(false);
  });
});
