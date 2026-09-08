import {
  Bell,
  CalendarDays,
  Clock3,
  Compass,
  FishSymbol,
  MapPinned,
  Users,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TaNoMarLogo } from '@/design-system/brand/TaNoMarLogo';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import { routes } from '@/shared/constants/routes';
import { ComparisonPreview } from './ComparisonPreview';
import styles from './landing.module.css';

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
    icon: Compass,
    title: 'Ranking para a sua decisão',
    description:
      'Compare pela nota ou ordene por vento, chuva e ondas nos planos que incluem personalização.',
  },
  {
    icon: Waves,
    title: 'Condições com contexto',
    description:
      'Veja vento, rajadas, chuva, ondas, swell, temperaturas e maré quando os dados estiverem disponíveis.',
  },
  {
    icon: Bell,
    title: 'Planejamento e alertas',
    description:
      'Salve favoritos, cadastre seus locais, mantenha alertas ativos e registre as saídas no diário.',
  },
  {
    icon: Users,
    title: 'Comunidade e recursos de campo',
    description:
      'Ajude a validar relatos, salve uma previsão para consultar sem conexão e veja câmeras no Capitão.',
  },
];

const questions = [
  {
    question: 'Posso usar antes de assinar?',
    answer:
      'Sim. O plano Free não tem prazo de teste e dá acesso ao mapa, ranking e previsão. Você assina apenas se quiser ampliar os limites e liberar outros recursos.',
  },
  {
    question: 'Quais locais estão disponíveis?',
    answer:
      'A base inicial reúne locais oficiais da Ilha de Santa Catarina. A lista pode crescer com locais compartilhados aprovados, e os planos pagos permitem cadastrar locais próprios pelas coordenadas.',
  },
  {
    question: 'Qual é a diferença entre local pessoal e favorito?',
    answer:
      'Local pessoal é um ponto cadastrado por você, privado ou enviado para a comunidade. Favorito é um local que já existe no TáNoMar e que você salva para encontrar mais rápido.',
  },
  {
    question: 'Como funcionam os alertas?',
    answer:
      'A cota do plano indica quantos alertas podem ficar ativos ao mesmo tempo. O TáNoMar verifica a previsão de hora em hora e avisa quando a nota mínima configurada é atingida.',
  },
  {
    question: 'Onde há câmeras ao vivo?',
    answer:
      'As câmeras aparecem apenas nos locais com uma transmissão válida vinculada. O acesso é do plano Capitão e também depende de o recurso estar disponível no TáNoMar. Cada câmera é um stream de terceiros: o TáNoMar apenas exibe a transmissão, não se responsabiliza pelas imagens e não garante manutenção nem disponibilidade.',
  },
  {
    question: 'Posso cancelar a assinatura?',
    answer:
      'Sim. Na conta, abra Gerenciar assinatura e toque em Cancelar renovação. Isso encerra a cobrança futura e não estorna o período já pago. Você continua usando o plano até o fim do mês ou do ano contratado e depois volta para o Free.',
  },
];

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
      <div className={styles.howRanking}>
        <div className={styles.howRankingCopy}>
          <span>Compare sem adivinhar</span>
          <h3>O ranking coloca nota, melhores horários e condições lado a lado.</h3>
          <p>
            Assim você encontra rapidamente os locais mais favoráveis para o dia escolhido. Nos
            planos pagos, também pode ordenar por vento, chuva ou ondas sem alterar a nota.
          </p>
        </div>
        <ComparisonPreview />
      </div>
    </section>
  );
}

export function ScoreExplanationSection() {
  return (
    <section className={`${styles.section} ${styles.scoreSection}`} aria-labelledby="score-title">
      <div className={styles.scoreExample}>
        <ScoreIndicator score={8.8} classification="very-good" />
        <span>Exemplo ilustrativo</span>
      </div>
      <div className={styles.scoreCopy}>
        <span>Como a nota funciona</span>
        <h2 id="score-title">Uma comparação objetiva das condições previstas.</h2>
        <p>
          A nota considera velocidade e direção do vento, altura e período das ondas, chance e
          volume de chuva, horário e o perfil costeiro do local.
        </p>
        <ul>
          <li>Uma nota alta indica uma combinação mais favorável desses critérios.</li>
          <li>O ranking usa a média das três melhores horas entre 5h e 20h.</li>
          <li>Espécie e modalidade de pesca não entram no cálculo.</li>
          <li>Maré e temperaturas dão contexto, mas não alteram a nota.</li>
        </ul>
        <small>As previsões são atualizadas ao longo do dia e continuam sendo estimativas.</small>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section className={styles.section} id="recursos" aria-labelledby="features-title">
      <div className={styles.sectionHeading}>
        <span>Recursos do TáNoMar</span>
        <h2 id="features-title">O essencial para planejar antes e acompanhar no caminho.</h2>
        <p>Os recursos variam conforme o plano e a disponibilidade dos dados em cada local.</p>
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

export function FaqSection() {
  return (
    <section className={styles.section} id="duvidas" aria-labelledby="faq-title">
      <div className={styles.sectionHeading}>
        <span>Dúvidas frequentes</span>
        <h2 id="faq-title">O que saber antes de começar.</h2>
      </div>
      <div className={styles.faqList}>
        {questions.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
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
        <h2 id="final-cta-title">Comece no Free e escolha sua próxima saída com mais contexto.</h2>
      </div>
      <Link className={styles.primaryCta} to={routes.login}>
        Começar grátis
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
          <a href="#comparacao-planos">Comparar planos</a>
          <a href="#instalar">Instalar</a>
          <a href="#duvidas">Dúvidas</a>
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
