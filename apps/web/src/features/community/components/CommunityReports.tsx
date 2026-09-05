import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Fish, Waves, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { ApiError } from '@/shared/api/errors';
import {
  confirmReport,
  contestReport,
  createReport,
  deleteReport,
  getReports,
} from '../services/communityService';
import type { ReportType } from '../types/community';
import { reportShortcuts, shortcutForComment } from '../utils/reportShortcuts';
import styles from './community.module.css';

const typeLabel: Record<ReportType, string> = {
  condicao: 'Condição',
  perigo: 'Perigo',
};

const shortcutIcons: Record<(typeof reportShortcuts)[number]['id'], LucideIcon> = {
  'deu-peixe': Fish,
  'mar-bom': Waves,
  'mar-ruim': Wind,
  perigo: AlertTriangle,
};

interface CommunityReportsProps {
  spotId: string;
  canReport: boolean;
}

export function CommunityReports({ spotId, canReport }: CommunityReportsProps) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<ReportType>('condicao');
  const [comment, setComment] = useState('');
  const reports = useQuery({
    queryKey: ['community-reports', spotId],
    queryFn: () => getReports(spotId),
  });

  const create = useMutation({
    mutationFn: ({
      reportType,
      reportComment,
    }: {
      reportType: ReportType;
      reportComment?: string;
    }) => createReport(spotId, reportType, reportComment),
    onSuccess: async () => {
      setComment('');
      await queryClient.invalidateQueries({ queryKey: ['community-reports', spotId] });
    },
  });

  const vote = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: 'confirm' | 'contest' }) =>
      kind === 'confirm' ? confirmReport(id) : contestReport(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['community-reports', spotId] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['community-reports', spotId] });
    },
  });

  const createError =
    create.error instanceof ApiError
      ? create.error.message
      : create.isError
        ? 'Não foi possível enviar o relato.'
        : null;
  const voteError =
    vote.error instanceof ApiError
      ? vote.error.message
      : vote.isError
        ? 'Não foi possível registrar o voto.'
        : null;
  const removeError =
    remove.error instanceof ApiError
      ? remove.error.message
      : remove.isError
        ? 'Não foi possível apagar o relato.'
        : null;

  return (
    <section className={styles.panel} aria-labelledby="community-reports">
      <div>
        <span className={styles.meta}>Comunidade</span>
        <h2 id="community-reports">Relatos no local</h2>
      </div>
      {canReport ? (
        <Card className={styles.item}>
          <div>
            <span className={styles.meta}>Atalhos</span>
            <p className={styles.hint}>
              Um toque envia o relato. Quem favoritou este local recebe um aviso no sino.
            </p>
          </div>
          <div className={styles.shortcuts} role="group" aria-label="Atalhos de relato">
            {reportShortcuts.map((shortcut) => {
              const Icon = shortcutIcons[shortcut.id];
              return (
                <button
                  key={shortcut.id}
                  type="button"
                  className={`${styles.shortcut} ${styles[shortcut.tone]}`}
                  onClick={() =>
                    create.mutate({
                      reportType: shortcut.type,
                      reportComment: shortcut.comment,
                    })
                  }
                  disabled={create.isPending}
                  aria-label={`Relatar ${shortcut.label}`}
                >
                  <Icon size={18} aria-hidden="true" />
                  <strong>{shortcut.label}</strong>
                  <span>{shortcut.hint}</span>
                </button>
              );
            })}
          </div>
          <div className={styles.custom}>
            <span className={styles.meta}>Outro relato</span>
            <div className={styles.types} role="group" aria-label="Tipo do relato">
              <button
                type="button"
                className={`${styles.typeChip} ${type === 'condicao' ? styles.typeChipActive : ''}`}
                onClick={() => setType('condicao')}
                aria-pressed={type === 'condicao'}
              >
                Condição
              </button>
              <button
                type="button"
                className={`${styles.typeChip} ${type === 'perigo' ? styles.typeChipActive : ''}`}
                onClick={() => setType('perigo')}
                aria-pressed={type === 'perigo'}
              >
                Perigo
              </button>
            </div>
            <label>
              <span className={styles.visuallyHidden}>Comentário</span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={280}
                placeholder="Conte o que você viu no local"
              />
            </label>
          </div>
          {createError ? <p>{createError}</p> : null}
          <Button
            type="button"
            onClick={() =>
              create.mutate({
                reportType: type,
                reportComment: comment.trim() || undefined,
              })
            }
            disabled={create.isPending}
          >
            Enviar relato
          </Button>
        </Card>
      ) : (
        <p>Relatos ficam nos locais públicos da comunidade.</p>
      )}
      {reports.isPending ? (
        <FeedbackState
          title="Lendo relatos"
          description="Buscando o que a comunidade viu aqui."
          busy
        />
      ) : reports.isError ? (
        <FeedbackState
          title="Relatos indisponíveis"
          description="Não foi possível carregar a comunidade."
        />
      ) : reports.data?.length ? (
        <div className={styles.list}>
          {reports.data.map((report) => {
            const shortcut = shortcutForComment(report.comment);
            return (
              <Card
                key={report.id}
                className={`${styles.item} ${report.type === 'perigo' ? styles.danger : ''}`}
              >
                <header>
                  <h3>{shortcut?.label ?? typeLabel[report.type]}</h3>
                  <span className={styles.meta}>
                    {report.confirmations} confirmaram · {report.contested} contestaram
                  </span>
                </header>
                {report.isMine ? <span className={styles.meta}>Seu relato</span> : null}
                {report.comment && report.comment !== shortcut?.label ? (
                  <p>{report.comment}</p>
                ) : null}
                {voteError && !report.isMine ? <p>{voteError}</p> : null}
                {removeError && report.isMine ? <p>{removeError}</p> : null}
                {report.isMine ? (
                  <div className={styles.votes}>
                    <Button
                      type="button"
                      variant="quiet"
                      onClick={() => remove.mutate(report.id)}
                      disabled={remove.isPending}
                    >
                      Apagar
                    </Button>
                  </div>
                ) : (
                  <div className={styles.votes}>
                    <Button
                      type="button"
                      variant={report.myVote === 'confirm' ? 'primary' : 'secondary'}
                      onClick={() => vote.mutate({ id: report.id, kind: 'confirm' })}
                      disabled={vote.isPending}
                    >
                      Confirmar
                    </Button>
                    <Button
                      type="button"
                      variant={report.myVote === 'contest' ? 'primary' : 'quiet'}
                      onClick={() => vote.mutate({ id: report.id, kind: 'contest' })}
                      disabled={vote.isPending}
                    >
                      Contestar
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <FeedbackState
          title="Nenhum relato ativo"
          description="Seja o primeiro a contar como está o local."
        />
      )}
    </section>
  );
}
