import { Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/design-system/components/Card';
import { useSubscriptionPlans } from '@/features/subscription/hooks/useSubscriptionPlans';
import { formatBrlFromCents, planFeatureList } from '@/features/subscription/subscriptionPlans';
import { routes } from '@/shared/constants/routes';
import styles from './landing.module.css';

export function PlansSection() {
  const catalog = useSubscriptionPlans();
  const plans = catalog.data ?? [];

  return (
    <section className={styles.section} id="planos" aria-labelledby="landing-plans-title">
      <div className={styles.sectionHeading}>
        <span>Planos configurados no TáNoMar</span>
        <h2 id="landing-plans-title">Escolha quanto contexto quer levar para o mar.</h2>
        <p>
          Preços, limites e recursos vêm do catálogo administrado no próprio sistema. Para assinar,
          entre na sua conta.
        </p>
      </div>
      {catalog.isPending ? (
        <p className={styles.catalogStatus} role="status">
          Carregando os planos disponíveis…
        </p>
      ) : null}
      {catalog.isError ? (
        <Card className={styles.catalogStatus} role="status">
          Não foi possível carregar os planos agora. Entre no TáNoMar para consultar o catálogo.
        </Card>
      ) : null}
      {plans.length > 0 ? (
        <div className={styles.planGrid}>
          {plans.map((plan) => (
            <Card
              as="article"
              className={`${styles.planCard} ${plan.featured ? styles.planFeatured : ''}`}
              key={plan.code}
              aria-labelledby={`landing-plan-${plan.code}`}
            >
              <div className={styles.planTopline}>
                <span>{plan.featured ? 'Mais escolhido' : 'Plano TáNoMar'}</span>
                {plan.featured ? <Sparkles size={18} aria-hidden="true" /> : null}
              </div>
              <h3 id={`landing-plan-${plan.code}`}>{plan.name}</h3>
              <p className={styles.planTagline}>{plan.tagline}</p>
              <p className={styles.planPrice}>
                <strong>{formatBrlFromCents(plan.monthlyPriceCents)}</strong>
                <span>por mês</span>
              </p>
              <ul className={styles.planFeatures}>
                {planFeatureList(plan).map((feature) => (
                  <li key={feature}>
                    <Check size={16} aria-hidden="true" /> {feature}
                  </li>
                ))}
              </ul>
              <Link
                className={plan.featured ? styles.primaryCta : styles.secondaryCta}
                to={routes.login}
              >
                Começar
              </Link>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
