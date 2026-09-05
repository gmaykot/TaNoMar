import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { parseNotification, parseNotificationList } from './notificationMapper';

const valid = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Novo relato',
  body: 'Alguém relatou condição em Campeche.',
  createdAt: '2026-09-05T12:00:00Z',
  readAt: null,
};

describe('notificationMapper', () => {
  it('valida o contrato da notificação', () => {
    expect(parseNotification(valid)).toMatchObject({
      id: valid.id,
      title: 'Novo relato',
      readAt: null,
    });
  });

  it('aceita lista vazia', () => {
    expect(parseNotificationList([])).toEqual([]);
  });

  it('rejeita item incompleto', () => {
    expect(() => parseNotification({ id: valid.id, title: valid.title })).toThrow(ContractError);
    expect(() => parseNotificationList([valid, { title: 'X' }])).toThrow(ContractError);
    expect(() => parseNotificationList({ items: [valid] })).toThrow(ContractError);
  });
});
