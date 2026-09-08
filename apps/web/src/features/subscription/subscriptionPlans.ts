export type SubscriptionPlanCode = 'arrais' | 'premium' | 'capitao';

export interface SubscriptionPlan {
  code: SubscriptionPlanCode;
  name: string;
  icon: 'anchor' | 'compass' | 'ship';
  monthlyPrice: string;
  period: string;
  tagline: string;
  featured?: boolean;
  featuredLabel?: string;
  features: string[];
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    code: 'arrais',
    name: 'Arrais',
    icon: 'anchor',
    monthlyPrice: 'R$ 14,90',
    period: '/mês',
    tagline: 'O primeiro comando da sua pesca.',
    features: [
      'Até 5 dias de previsão',
      'Detalhes do mar',
      '5 locais pessoais e 10 favoritos',
      '5 alertas de oportunidade',
      'Diário, offline e indicadores',
      'Confirmar e contestar relatos',
    ],
  },
  {
    code: 'premium',
    name: 'Mestre',
    icon: 'compass',
    monthlyPrice: 'R$ 19,90',
    period: '/mês',
    tagline: 'O equilíbrio para planejar a semana.',
    featured: true,
    featuredLabel: 'Mais escolhido',
    features: [
      'Até 8 dias de previsão',
      'Detalhes do mar',
      '10 locais pessoais e 20 favoritos',
      '10 alertas de oportunidade',
      'Diário, offline e indicadores',
      'Confirmar e contestar relatos',
    ],
  },
  {
    code: 'capitao',
    name: 'Capitão',
    icon: 'ship',
    monthlyPrice: 'R$ 24,90',
    period: '/mês',
    tagline: 'Mais cotas para quem pesca o ano todo.',
    features: [
      'Até 8 dias de previsão',
      'Detalhes do mar',
      '20 locais pessoais e 40 favoritos',
      '20 alertas de oportunidade',
      'Diário, offline e indicadores',
      'Confirmar e contestar relatos',
    ],
  },
];
