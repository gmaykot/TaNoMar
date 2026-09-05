import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { parseAdminPartner, parsePartner, parsePartnerList } from './partnerMapper';

const sample = {
  id: 'loja-do-mar',
  slug: 'loja-do-mar',
  name: 'Loja do Mar',
  category: 'loja',
  tagline: 'Iscas e linhas na Lagoa',
  about: 'Atendemos quem sai cedo.',
  city: 'Florianópolis',
  whatsApp: '5548999999999',
  instagram: 'lojadomar',
  website: 'https://loja.example',
  mapsUrl: 'https://maps.example',
  coverImageUrl: null,
  isFeatured: true,
  offers: [{ title: 'Kit básico', description: 'Linha e isca', priceLabel: 'R$ 45', endsAt: null }],
};

describe('parsePartner', () => {
  it('aceita o contrato público', () => {
    expect(parsePartner(sample)).toMatchObject({
      slug: 'loja-do-mar',
      category: 'loja',
      isFeatured: true,
      offers: [{ title: 'Kit básico', priceLabel: 'R$ 45' }],
    });
  });

  it('rejeita categoria desconhecida', () => {
    expect(() => parsePartner({ ...sample, category: 'barco' })).toThrow(ContractError);
  });
});

describe('parsePartnerList', () => {
  it('mapeia a lista', () => {
    expect(parsePartnerList([sample])).toHaveLength(1);
  });
});

describe('parseAdminPartner', () => {
  it('exige campos de publicação', () => {
    expect(() => parseAdminPartner(sample)).toThrow(ContractError);
    expect(
      parseAdminPartner({
        ...sample,
        isPublished: true,
        sortOrder: 1,
        createdAt: '2026-09-05T12:00:00+00:00',
        updatedAt: '2026-09-05T12:00:00+00:00',
      }).isPublished,
    ).toBe(true);
  });
});
