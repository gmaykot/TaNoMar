import { ArrowDown, ArrowRight, FishSymbol, MonitorSmartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LandingHeader } from './LandingHeader';
import {
  FaqSection,
  FeaturesSection,
  FinalCtaSection,
  HowItWorksSection,
  LandingFooter,
  SafetyNotice,
  ScoreExplanationSection,
} from './LandingSections';
import { PlansSection } from './PlansSection';
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
                Começar grátis <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a className={styles.secondaryCta} href="#como-funciona">
                Ver como funciona <ArrowDown size={18} aria-hidden="true" />
              </a>
            </div>
            <small className={styles.heroNote}>
              <MonitorSmartphone size={17} aria-hidden="true" /> Use pelo navegador ou instale no
              celular
            </small>
          </div>
          <ProductPreview />
        </section>
        <HowItWorksSection />
        <ScoreExplanationSection />
        <FeaturesSection />
        <PlansSection />
        <PwaInstallSection />
        <FaqSection />
        <SafetyNotice />
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
