import { ArrowLeft, Bell, Heart, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/design-system/components/Card';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

const benefits = [
  {
    icon: Waves,
    title: 'Previsão ampliada',
    description: 'Consulte mais dias e escolha uma ênfase para vento, chuva ou ondas.',
  },
  {
    icon: Heart,
    title: 'Seus locais e favoritos',
    description: 'Guarde os pontos que fazem parte da sua rotina de pesca.',
  },
  {
    icon: Bell,
    title: 'Alertas de oportunidade',
    description: 'Receba avisos quando as condições que você acompanha aparecerem.',
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
        title="Mais contexto para escolher sua saída."
        description="Veja o que já está disponível e o que estamos preparando para os alertas personalizados."
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
        <h2>Ativação</h2>
        <p>
          A ativação comercial ainda precisa ser configurada pela equipe do TáNoMar. Enquanto isso,
          esta página torna os benefícios visíveis sem iniciar uma cobrança ou criar uma assinatura.
        </p>
        <Link className={styles.backLink} to={routes.about}>
          Entender como a previsão funciona
        </Link>
      </Card>
    </div>
  );
}
