import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  Heart,
  SlidersHorizontal,
  Sparkles,
  Waves,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/design-system/components/Card';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';
import premiumStyles from './premium.module.css';

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
  const auth = useAuth();
  const isPremium = auth.user?.plan.code === 'premium';

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.account}>
        <ArrowLeft size={16} aria-hidden="true" /> Conta
      </Link>
      <PageHeader
        eyebrow="Plano Premium"
        title="Pesque com mais contexto."
        description="Mais informação para comparar os dias, escolher seus locais e sair com mais confiança."
      />
      <section className={premiumStyles.hero} aria-labelledby="premium-hero-title">
        <div className={premiumStyles.heroCopy}>
          <span className={premiumStyles.heroEyebrow}>
            <Sparkles size={16} aria-hidden="true" /> O próximo passo para sua pesca
          </span>
          <h2 id="premium-hero-title">Encontre a melhor janela antes de sair.</h2>
          <p>
            Compare mais dias, acompanhe o mar com detalhes e personalize a previsão para o que
            realmente importa na sua pescaria.
          </p>
          <div className={premiumStyles.heroActions}>
            <Link className={premiumStyles.heroLink} to={routes.about}>
              Entender a previsão <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <span>{isPremium ? 'Seu plano atual' : 'Conheça os recursos incluídos'}</span>
          </div>
        </div>
        <div className={premiumStyles.heroHighlight} aria-label="Resumo dos benefícios Premium">
          <strong>8 dias</strong>
          <span>para planejar</span>
          <div>
            <Check size={16} aria-hidden="true" /> Detalhes do mar
          </div>
          <div>
            <Check size={16} aria-hidden="true" /> Alertas nos seus locais
          </div>
        </div>
      </section>
      <div className={premiumStyles.benefitIntro}>
        <div>
          <span>O que muda</span>
          <h2>Mais controle para cada saída</h2>
        </div>
        <p>Recursos pensados para transformar previsão em decisão.</p>
      </div>
      <div className={premiumStyles.benefitGrid}>
        {benefits.map(({ icon: Icon, title, description }) => (
          <Card as="article" className={premiumStyles.benefitCard} key={title}>
            <span className={premiumStyles.benefitIcon}>
              <Icon size={20} aria-hidden="true" />
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
          </Card>
        ))}
      </div>
      <Card as="section" className={premiumStyles.infoCard}>
        <div>
          <span>Disponibilidade</span>
          <h2>Comece conhecendo os recursos</h2>
        </div>
        <p>
          A ativação comercial ainda está sendo configurada pela equipe do TáNoMar. Por enquanto,
          esta página apresenta os recursos e não inicia cobrança nem cria assinatura.
        </p>
        <Link className={styles.backLink} to={routes.about}>
          Saiba como a previsão é feita <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </Card>
    </div>
  );
}
