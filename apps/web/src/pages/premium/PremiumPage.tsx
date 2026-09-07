import { ArrowLeft, Bell, BookOpen, Heart, SlidersHorizontal, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/design-system/components/Card';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

const benefits = [
  {
    icon: Waves,
    title: 'Previsão ampliada',
    description:
      'Consulte até 8 dias de previsão e veja os detalhes do mar para planejar melhor.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Leitura sob medida',
    description:
      'Destaque vento, chuva ou ondas e escolha os indicadores mais importantes para você.',
  },
  {
    icon: Heart,
    title: 'Seus locais e favoritos',
    description: 'Cadastre até 10 locais privados e guarde até 20 pontos favoritos.',
  },
  {
    icon: Bell,
    title: 'Alertas de oportunidade',
    description: 'Configure até 10 alertas para acompanhar as condições dos seus locais.',
  },
  {
    icon: BookOpen,
    title: 'Diário de pesca',
    description:
      'Registre suas capturas e saídas sem captura para criar seu histórico de pesca.',
  },
];

export function PremiumPage() {
  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.account}>
        <ArrowLeft size={16} aria-hidden="true" /> Conta
      </Link>
      <PageHeader
        eyebrow="Plano Premium"
        title="Pesque com mais contexto."
        description="O Premium reúne mais dados, mais controle e ferramentas para você planejar cada saída."
      />
      <div className={styles.locationGrid}>
        {benefits.map(({ icon: Icon, title, description }) => (
          <Card as="article" key={title}>
            <Icon size={22} aria-hidden="true" />
            <h2>{title}</h2>
            <p>{description}</p>
          </Card>
        ))}
      </div>
      <Card as="section">
        <h2>Como funciona</h2>
        <p>
          A ativação comercial ainda precisa ser configurada pela equipe do TáNoMar. Esta página
          explica os recursos do plano e não inicia uma cobrança ou cria uma assinatura.
        </p>
        <Link className={styles.backLink} to={routes.about}>
          Entender como a previsão funciona
        </Link>
      </Card>
    </div>
  );
}
