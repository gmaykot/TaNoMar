import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { parseAdminUser, parseAdminUserList } from './adminUserMapper';

const sample = {
  id: '7a4c1e87-3184-4fd6-8b38-4a6d0e0b0003',
  name: 'Ana',
  email: 'ana@example.com',
  pictureUrl: null,
  role: 'User',
  isActive: true,
  plan: { code: 'free', name: 'Free' },
  createdAt: '2026-09-05T12:00:00+00:00',
  isSelf: false,
  protection: null,
  canChangePlan: true,
  canDeactivate: true,
};

describe('parseAdminUser', () => {
  it('aceita o contrato de usuário admin', () => {
    expect(parseAdminUser(sample)).toMatchObject({
      id: sample.id,
      email: 'ana@example.com',
      plan: { code: 'free', name: 'Free' },
      canChangePlan: true,
    });
  });

  it('rejeita payload incompleto', () => {
    expect(() => parseAdminUser({ ...sample, email: 1 })).toThrow(ContractError);
  });
});

describe('parseAdminUserList', () => {
  it('mapeia a lista', () => {
    expect(parseAdminUserList([sample])).toHaveLength(1);
  });

  it('rejeita valor que não é lista', () => {
    expect(() => parseAdminUserList(sample)).toThrow(ContractError);
  });
});
