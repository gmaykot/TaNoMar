import { Link } from 'react-router-dom';
import { Card } from '@/design-system/components/Card';
import { ANNUAL_DISCOUNT_PERCENT } from '@/features/billing/billing';
import { PlanComparisonPanel } from '@/features/subscription/components/PlanComparisonPanel';
import { PlanOfferCard } from '@/features/subscription/components/PlanOfferCard';
import offerStyles from '@/features/subscription/components/planOffer.module.css';
import { useSubscriptionPlans } from '@/features/subscription/hooks/useSubscriptionPlans';
import { plansWithFreeBaseline } from '@/features/subscription/subscriptionPlans';
import { routes } from '@/shared/constants/routes';
import styles from './landing.module.css';

export function PlansSection() {
  const catalog = useSubscriptionPlans();
  const freePlan = catalog.data?.find((plan) => plan.code === 'free');
  const plans = catalog.data?.filter((plan) => plan.code !== 'free') ?? [];

  return (
    <section className={styles.section} id="planos" aria-labelledby="landing-plans-title">
      <div className={styles.sectionHeading}>
        <span>Planos</span>
        <h2 id="landing-plans-title">Comece grátis e assine quando precisar de mais.</h2>
        <p>
          O Free não tem prazo de teste. Os planos pagos ampliam o período, cobram no mês ou no ano
          e o anual sai com {ANNUAL_DISCOUNT_PERCENT}% de desconto.
        </p>
      </div>
      {freePlan ? (
        <div className={styles.freeAccess}>
          <div>
            <span>Acesso inicial</span>
            <h3>{freePlan.name}</h3>
            <p>
              Mapa, ranking e até {freePlan.entitlements.maxForecastDays} dias de previsão, sem
              cadastrar cartão.
            </p>
          </div>
          <Link className={styles.secondaryCta} to={routes.login}>
            Experimentar grátis
          </Link>
        </div>
      ) : null}
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
        <div className={offerStyles.planGrid}>
          {plans.map((plan) => (
            <PlanOfferCard key={plan.code} plan={plan} headingId={`landing-plan-${plan.code}`}>
              <Link
                className={plan.featured ? styles.primaryCta : styles.secondaryCta}
                to={routes.login}
              >
                Escolher {plan.name}
              </Link>
            </PlanOfferCard>
          ))}
        </div>
      ) : null}
      {catalog.data && catalog.data.length > 0 ? (
        <PlanComparisonPanel plans={plansWithFreeBaseline(plans, catalog.data)} />
      ) : null}
    </section>
  );
}
