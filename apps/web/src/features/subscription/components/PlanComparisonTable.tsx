import { annualCents } from '@/features/billing/billing';
import { formatBrlFromCents, type PlanCatalog } from '../subscriptionPlans';
import styles from './planComparison.module.css';

export function PlanComparisonTable({
  plans,
  currentPlanCode,
  id,
}: {
  plans: PlanCatalog[];
  currentPlanCode?: string;
  id?: string;
}) {
  if (plans.length === 0) return null;

  return (
    <div className={styles.planComparison} id={id}>
      <table aria-label="Comparação dos planos">
        <thead>
          <tr>
            <th scope="col">Recurso</th>
            {plans.map((plan) => (
              <th
                className={plan.code === 'free' ? styles.freeColumn : undefined}
                scope="col"
                key={plan.code}
              >
                {plan.name}
                {currentPlanCode === plan.code ? <small>Plano atual</small> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <ComparisonRow
            label="Mensal"
            plans={plans}
            value={(plan) =>
              plan.code === 'free' ? 'Grátis' : formatBrlFromCents(plan.monthlyPriceCents)
            }
          />
          <ComparisonRow
            label="Anual"
            plans={plans}
            value={(plan) =>
              plan.code === 'free' ? '—' : formatBrlFromCents(annualCents(plan.monthlyPriceCents))
            }
          />
          <ComparisonRow
            label="Previsão"
            plans={plans}
            value={(plan) => `${plan.entitlements.maxForecastDays} dias`}
          />
          <ComparisonRow
            label="Locais pessoais"
            plans={plans}
            value={(plan) => quotaLabel(plan.entitlements.maxPersonalSpots)}
          />
          <ComparisonRow
            label="Favoritos"
            plans={plans}
            value={(plan) => quotaLabel(plan.entitlements.maxFavorites)}
          />
          <ComparisonRow
            label="Alertas"
            plans={plans}
            value={(plan) => quotaLabel(plan.entitlements.maxAlerts)}
          />
          <ComparisonRow
            label="Câmeras ao vivo"
            plans={plans}
            value={(plan) => (plan.modules.liveWebcams ? 'Incluídas' : '—')}
          />
        </tbody>
      </table>
    </div>
  );
}

function quotaLabel(value: number) {
  return value > 0 ? String(value) : '—';
}

function ComparisonRow({
  label,
  plans,
  value,
}: {
  label: string;
  plans: PlanCatalog[];
  value: (plan: PlanCatalog) => string;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      {plans.map((plan) => (
        <td className={plan.code === 'free' ? styles.freeColumn : undefined} key={plan.code}>
          {value(plan)}
        </td>
      ))}
    </tr>
  );
}
