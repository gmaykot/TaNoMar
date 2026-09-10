import { AlertTriangle, LoaderCircle } from 'lucide-react';
import type { ForecastRefresh } from '@/features/fishing/types/fishing';
import styles from './ForecastRefreshNotice.module.css';

interface ForecastRefreshNoticeProps {
  refresh?: ForecastRefresh | null;
}

export function ForecastRefreshNotice({ refresh }: ForecastRefreshNoticeProps) {
  if (!refresh || refresh.state === 'fresh') return null;

  const updating = refresh.state === 'updating' || refresh.state === 'preparing';
  const title = updating
    ? 'Atualizando locais'
    : refresh.state === 'stale'
      ? 'Exibindo a última previsão disponível'
      : 'Alguns locais não puderam ser atualizados';
  const description = updating
    ? refresh.state === 'preparing'
      ? 'As primeiras previsões aparecerão aqui sem bloquear o restante do app.'
      : 'Você já pode consultar os dados disponíveis enquanto concluímos a atualização.'
    : 'Os dados disponíveis continuam visíveis enquanto tentamos uma nova atualização.';

  return (
    <div className={styles.notice} role="status" aria-live="polite">
      {updating ? (
        <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" />
      ) : (
        <AlertTriangle size={18} aria-hidden="true" />
      )}
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
    </div>
  );
}
