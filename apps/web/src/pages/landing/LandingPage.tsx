import { ArrowDown, ArrowRight, FishSymbol, MonitorSmartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LandingHeader } from './LandingHeader';
import {
  FeaturesSection,
  FinalCtaSection,
  HowItWorksSection,
  LandingFooter,
  SafetyNotice,
  ValuePropositionSection,
} from './LandingSections';
import { PlansSection } from './PlansSection';
import { ComparisonPreview } from './ComparisonPreview';
import { ProductPreview } from './ProductPreview';
import { PwaInstallSection } from './PwaInstallSection';
import { routes } from '@/shared/constants/routes';
import styles from './landing.module.css';

export function LandingPage() {
  return (
    <div className={styles.landing}>
      <a className={styles.skipLink} href="#conteudo-principal">
        Pular para o conteúdo
      </a>
      <LandingHeader />
      <main id="conteudo-principal">
        <section className={styles.hero} id="inicio" aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <FishSymbol size={17} aria-hidden="true" /> PESQUE NO MOMENTO CERTO.
            </span>
            <h1 id="landing-title">
              Entenda o mar <span>antes de sair para pescar.</span>
            </h1>
            <p>
              Previsão, maré, vento, ondas e melhores horários reunidos em uma experiência simples
              para ajudar você a escolher onde e quando pescar.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryCta} to={routes.login}>
                Acessar o TáNoMar <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a className={styles.secondaryCta} href="#recursos">
                Conhecer os recursos <ArrowDown size={18} aria-hidden="true" />
              </a>
            </div>
            <small className={styles.heroNote}>
              <MonitorSmartphone size={17} aria-hidden="true" /> Use pelo navegador ou instale no
              celular
            </small>
          </div>
          <ProductPreview />
        </section>
        <ValuePropositionSection />
        <HowItWorksSection />
        <FeaturesSection />
        <section
          className={`${styles.section} ${styles.previewSection}`}
          aria-labelledby="preview-title"
        >
          <div className={styles.previewSectionCopy}>
            <span>Uma leitura que parece parte do mar</span>
            <h2 id="preview-title">Veja a condição, entenda o contexto e compare.</h2>
            <p>
              O ranking coloca os locais lado a lado com a mesma nota do aplicativo. Os dados da
              demonstração são ilustrativos; sua previsão é calculada pela API para os locais e dias
              disponíveis.
            </p>
            <Link className={styles.textLink} to={routes.login}>
              Entrar para ver a previsão <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <ComparisonPreview />
        </section>
        <PlansSection />
        <PwaInstallSection />
        <SafetyNotice />
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
