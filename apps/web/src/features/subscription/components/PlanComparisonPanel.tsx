import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PlanComparisonTable } from './PlanComparisonTable';
import type { PlanCatalog } from '../subscriptionPlans';
import styles from './planOffer.module.css';

const COMPARISON_HASH = '#comparacao-planos';

export function PlanComparisonPanel({
  plans,
  currentPlanCode,
}: {
  plans: PlanCatalog[];
  currentPlanCode?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(
    () => typeof window !== 'undefined' && window.location.hash === COMPARISON_HASH,
  );

  useEffect(() => {
    function openFromHash() {
      if (window.location.hash !== COMPARISON_HASH) return;
      setOpen(true);
      const node = detailsRef.current;
      if (typeof node?.scrollIntoView === 'function') {
        node.scrollIntoView({ block: 'start' });
      }
    }

    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

  if (plans.length === 0) return null;

  return (
    <details
      ref={detailsRef}
      className={styles.planComparisonBlock}
      id="comparacao-planos"
      open={open}
    >
      <summary
        className={styles.planComparisonToggle}
        onClick={(event) => {
          event.preventDefault();
          setOpen((current) => !current);
        }}
      >
        Comparar os planos
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      {open ? (
        <>
          <p className={styles.planComparisonHint}>
            No celular, deslize a tabela para o lado para ver todos os planos.
          </p>
          <PlanComparisonTable plans={plans} currentPlanCode={currentPlanCode} />
        </>
      ) : null}
    </details>
  );
}
