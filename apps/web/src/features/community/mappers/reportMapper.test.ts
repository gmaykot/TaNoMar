import { describe, expect, it } from 'vitest';
import { parseReport } from './reportMapper';

describe('reportMapper', () => {
  it('valida o contrato do relato', () => {
    const report = parseReport({
      id: '11111111-1111-1111-1111-111111111111',
      spotId: 'campeche',
      spotName: 'Campeche',
      type: 'perigo',
      comment: 'Corrente forte',
      createdAt: '2026-09-05T12:00:00Z',
      expiresAt: '2026-09-06T12:00:00Z',
      confirmations: 2,
      contested: 0,
      myVote: 'confirm',
      isMine: false,
    });
    expect(report).toMatchObject({
      type: 'perigo',
      myVote: 'confirm',
      confirmations: 2,
      isMine: false,
    });
  });
});
