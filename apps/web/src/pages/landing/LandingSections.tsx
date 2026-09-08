import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  Compass,
  FishSymbol,
  Heart,
  ListChecks,
  MapPinned,
  Thermometer,
  Trophy,
  Video,
  Waves,
  Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TaNoMarLogo } from '@/design-system/brand/TaNoMarLogo';
import { routes } from '@/shared/constants/routes';
import styles from './landing.module.css';

const values: Array<{ icon: LucideIcon; title: string; description: string }> = [
  {
    icon: Compass,
    title: 'Uma leitura só',
    description: 'Condições importantes reunidas sem precisar cruzar vários sites.',
  },
  {
    icon: MapPinned,
    title: 'Locais lado a lado',
    description: 'Compare locais, dias e horários com uma visão organizada.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Contexto para decidir',
    description: 'Nota, ranking e indicadores ajudam a entender o cenário.',
  },
  {
    icon: ListChecks,
    title: 'Planejamento simples',
    description: 'Veja as melhores janelas e prepare sua saída com mais informação.',
  },
];

const steps = [
  {
    icon: CalendarDays,
    title: 'Escolha o dia',
    description: 'Navegue pelo período disponível no seu plano.',
  },
  {
    icon: MapPinned,
    title: 'Compare os locais',
    description: 'Veja ranking, nota e condições relevantes de cada local.',
  },
  {
    icon: Clock3,
    title: 'Planeje a pescaria',
    description: 'Confira os melhores horários antes de organizar a saída.',
  },
];

const features: Array<{ icon: LucideIcon; title: string; description: string }> = [
  {
    icon: Trophy,
    title: 'Ranking e nota',
    description: 'Uma leitura comparável das condições de pesca entre os locais.',
  },
  {
    icon: Clock3,
    title: 'Melhores dias e horários',
    description: 'Janelas de oportunidade para apoiar o planejamento da pescaria.',
  },
  {
    icon: Wind,
    title: 'Vento, rajadas e chuva',
    description: 'Indicadores meteorológicos organizados em uma experiência simples.',
  },
  {
    icon: Waves,
    title: 'Ondas, swell e maré',
    description: 'Detalhes do mar, preamar, baixa-mar e curva quando disponíveis no plano.',
  },
  {
    icon: Thermometer,
    title: 'Temperatura do ar e da água',
    description: 'Mais contexto para entender a condição prevista em cada local.',
  },
  {
    icon: Heart,
    title: 'Favoritos e preferências',
    description: 'Guarde locais e escolha os indicadores mais importantes conforme o plano.',
  },
  {
    icon: Bell,
    title: 'Alertas e diário',
    description:
      'Acompanhe oportunidades e registre seu histórico nos planos que incluem os módulos.',
  },
  {
    icon: Video,
    title: 'Câmeras ao vivo',
    description:
      'Veja transmissões vinculadas quando houver câmera disponível e o plano incluir o recurso.',
  },
];

export function ValuePropositionSection() {
  return (
    <section className={styles.section} aria-labelledby="value-title">
      <div className={styles.sectionHeading}>
        <span>Tudo começa com a informação certa</span>
        <h2 id="value-title">Menos abas abertas. Mais clareza antes de sair.</h2>
      </div>
      <div className={styles.valueGrid}>
        {values.map(({ icon: Icon, title, description }) => (
          <article className={styles.valueCard} key={title}>
            <span className={styles.featureIcon}>
              <Icon size={22} aria-hidden="true" />
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section
      className={`${styles.section} ${styles.howSection}`}
      id="como-funciona"
      aria-labelledby="how-title"
    >
      <div className={styles.sectionHeading}>
        <span>Como funciona</span>
        <h2 id="how-title">Do calendário ao melhor horário, em três passos.</h2>
      </div>
      <ol className={styles.steps}>
        {steps.map(({ icon: Icon, title, description }, index) => (
          <li key={title}>
            <span className={styles.stepNumber}>{index + 1}</span>
            <Icon size={26} aria-hidden="true" />
            <h3>{title}</h3>
            <p>{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section className={styles.section} id="recursos" aria-labelledby="features-title">
      <div className={styles.sectionHeading}>
        <span>Recursos do TáNoMar</span>
        <h2 id="features-title">O mar muda. Sua leitura acompanha.</h2>
        <p>Os recursos disponíveis variam conforme o plano e a disponibilidade dos dados.</p>
      </div>
      <div className={styles.featureGrid}>
        {features.map(({ icon: Icon, title, description }) => (
          <article className={styles.featureCard} key={title}>
            <span className={styles.featureIcon}>
              <Icon size={21} aria-hidden="true" />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SafetyNotice() {
  return (
    <aside className={styles.safetyNotice} aria-label="Aviso de segurança">
      <FishSymbol size={22} aria-hidden="true" />
      <p>
        As previsões são estimativas e podem mudar. Antes de sair, confira as condições locais,
        alertas oficiais e utilize os equipamentos de segurança adequados.
      </p>
    </aside>
  );
}

export function FinalCtaSection() {
  return (
    <section className={styles.finalCta} aria-labelledby="final-cta-title">
      <div>
        <span>Tá no mar?</span>
        <h2 id="final-cta-title">Seu próximo dia no mar começa com uma escolha melhor.</h2>
      </div>
      <Link className={styles.primaryCta} to={routes.login}>
        Acessar o TáNoMar
      </Link>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerMain}>
        <div>
          <TaNoMarLogo />
          <p>Condições do mar organizadas para ajudar você a planejar onde e quando pescar.</p>
        </div>
        <nav aria-label="Links do rodapé">
          <a href="#como-funciona">Como funciona</a>
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
          <a href="#instalar">Instalar</a>
          <Link to={routes.login}>Acessar o aplicativo</Link>
        </nav>
      </div>
      <div className={styles.footerBottom}>
        <span>© {new Date().getFullYear()} TáNoMar.</span>
        <span>Previsões apoiam a decisão e não substituem cuidados de segurança.</span>
      </div>
    </footer>
  );
}
