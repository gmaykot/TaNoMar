import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Info, Timer } from 'lucide-react';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { IconButton } from '@/design-system/components/IconButton';
import {
  adminWorkersQueryKey,
  useAdminWorkers,
} from '@/features/admin-workers/hooks/useAdminWorkers';
import { updateAdminWorker } from '@/features/admin-workers/services/adminWorkersService';
import type { AdminWorker } from '@/features/admin-workers/types/adminWorker';
import { PageHeader } from '@/pages/shared/PageHeader';
import { ApiError } from '@/shared/api/errors';
import pageStyles from '@/pages/shared/pages.module.css';
import styles from './adminWorkers.module.css';

function WorkerCard({ worker }: { worker: AdminWorker }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(worker.enabled);
  const [cronExpression, setCronExpression] = useState(worker.cronExpression ?? '');
  const [showInfo, setShowInfo] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      updateAdminWorker(worker.key, {
        isEnabled: enabled,
        cronExpression: worker.kind === 'scheduled' ? cronExpression : null,
      }),
    onSuccess: async (saved) => {
      setEnabled(saved.enabled);
      setCronExpression(saved.cronExpression ?? '');
      await queryClient.invalidateQueries({ queryKey: adminWorkersQueryKey });
      showSaveConfirmation(`${saved.name} salvo.`);
    },
  });

  return (
    <Card as="article" className={styles.workerCard} aria-label={worker.name}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className={styles.workerHeader}>
          <div>
            <span className={styles.kind}>
              {worker.kind === 'scheduled' ? 'Agendado' : 'Consumidor de fila'}
            </span>
            <h2>{worker.name}</h2>
          </div>
          <IconButton
            label={`Informações sobre ${worker.name}`}
            aria-expanded={showInfo}
            onClick={() => setShowInfo((current) => !current)}
          >
            <Info size={18} aria-hidden="true" />
          </IconButton>
        </div>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={enabled}
            disabled={mutation.isPending}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          <span>
            Worker habilitado
            <small>Ao desligar, uma execução já iniciada pode terminar.</small>
          </span>
        </label>

        {worker.kind === 'scheduled' ? (
          <label className={styles.field}>
            <span>Periodicidade (CRON)</span>
            <input
              value={cronExpression}
              required
              spellCheck="false"
              disabled={mutation.isPending}
              onChange={(event) => setCronExpression(event.target.value)}
            />
            <small>
              minuto hora dia mês dia-da-semana · fuso {worker.timeZone}. Ex.: 0 * * * *
            </small>
          </label>
        ) : (
          <p className={styles.queueHint}>
            <Timer size={16} aria-hidden="true" />
            Sob demanda: este worker é acionado pela fila interna e não usa CRON.
          </p>
        )}

        {showInfo ? (
          <dl className={styles.infoPanel}>
            <div>
              <dt>O que é</dt>
              <dd>{worker.description}</dd>
            </div>
            <div>
              <dt>Onde é usado</dt>
              <dd>{worker.usedBy}</dd>
            </div>
            <div>
              <dt>De onde busca</dt>
              <dd>{worker.dataSource}</dd>
            </div>
          </dl>
        ) : null}

        {mutation.isError ? (
          <p className={styles.error} role="alert">
            {mutation.error instanceof ApiError
              ? mutation.error.message
              : 'Não foi possível salvar o worker.'}
          </p>
        ) : null}

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando…' : 'Salvar worker'}
        </Button>
      </form>
    </Card>
  );
}

export function AdminWorkersPage() {
  const workers = useAdminWorkers();

  return (
    <div className={pageStyles.page}>
      <PageHeader
        eyebrow="Administração"
        title="Workers"
        description="Habilite processos internos e ajuste a periodicidade dos workers agendados."
      />
      {workers.isPending ? (
        <FeedbackState title="Carregando workers" description="Lendo as configurações atuais." busy />
      ) : workers.isError ? (
        <FeedbackState
          title="Não foi possível carregar os workers"
          description="Tente novamente para consultar as configurações."
          action={
            <Button type="button" onClick={() => workers.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : (
        <section className={styles.workerList} aria-label="Workers cadastrados">
          {workers.data.map((worker) => (
            <WorkerCard key={`${worker.key}:${worker.enabled}:${worker.cronExpression}`} worker={worker} />
          ))}
        </section>
      )}
    </div>
  );
}
