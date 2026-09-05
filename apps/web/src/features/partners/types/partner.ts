export const partnerCategories = ['loja', 'guia', 'hospedagem', 'outro'] as const;

export type PartnerCategory = (typeof partnerCategories)[number];

export interface PartnerOffer {
  title: string;
  description: string | null;
  priceLabel: string | null;
  endsAt: string | null;
}

export interface Partner {
  id: string;
  slug: string;
  name: string;
  category: PartnerCategory;
  tagline: string | null;
  about: string | null;
  city: string;
  whatsApp: string | null;
  instagram: string | null;
  website: string | null;
  mapsUrl: string | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
  offers: PartnerOffer[];
}

export interface AdminPartner extends Partner {
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerInput {
  name: string;
  category: PartnerCategory;
  tagline: string;
  about: string;
  city: string;
  whatsApp: string;
  instagram: string;
  website: string;
  mapsUrl: string;
  coverImageUrl: string;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
  offers: PartnerOffer[];
}

export const partnerCategoryLabel: Record<PartnerCategory, string> = {
  loja: 'Loja de pesca',
  guia: 'Leva para pescar',
  hospedagem: 'Hospedagem',
  outro: 'Outro',
};

export function emptyPartnerInput(): PartnerInput {
  return {
    name: '',
    category: 'loja',
    tagline: '',
    about: '',
    city: '',
    whatsApp: '',
    instagram: '',
    website: '',
    mapsUrl: '',
    coverImageUrl: '',
    isPublished: false,
    isFeatured: false,
    sortOrder: 0,
    offers: [],
  };
}

export function partnerToInput(partner: AdminPartner): PartnerInput {
  return {
    name: partner.name,
    category: partner.category,
    tagline: partner.tagline ?? '',
    about: partner.about ?? '',
    city: partner.city,
    whatsApp: partner.whatsApp ?? '',
    instagram: partner.instagram ?? '',
    website: partner.website ?? '',
    mapsUrl: partner.mapsUrl ?? '',
    coverImageUrl: partner.coverImageUrl ?? '',
    isPublished: partner.isPublished,
    isFeatured: partner.isFeatured,
    sortOrder: partner.sortOrder,
    offers: partner.offers.map((offer) => ({ ...offer })),
  };
}
