import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Fish, Lock, Waves, Wind } from 'lucide-react';
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
import { formatDateTime, isSameCalendarDay } from '@/shared/utils/formatDateTime';
import type { ReportType } from '../types/community';
import { reportShortcuts, shortcutForComment } from '../utils/reportShortcuts';
import { ReportConfirmDrawer } from './ReportConfirmDrawer';
import styles from './community.module.css';

const typeLabel: Record<ReportType, string> = {
  condicao: 'Condição',
  perigo: 'Perigo',
};

interface PendingCreate {
  reportType: ReportType;
  reportComment?: string;
  label: string;
}

function reportKey(type: ReportType, comment?: string | null) {
  return `${type}:${comment?.trim() ?? ''}`;
}

const shortcutIcons: Record<(typeof reportShortcuts)[number]['id'], LucideIcon> = {
  'deu-peixe': Fish,
  'mar-bom': Waves,
  'mar-ruim': Wind,
  perigo: AlertTriangle,
};

interface CommunityReportsProps {
  spotId: string;
  canReport: boolean;
  canVote?: boolean;
}

export function CommunityReports({ spotId, canReport, canVote = false }: CommunityReportsProps) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<ReportType>('condicao');
  const [comment, setComment] = useState('');
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
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
    onMutate: () => {
      setSentMessage(null);
    },
    onSuccess: async () => {
      setComment('');
      setPendingCreate(null);
      setSentMessage('Relato enviado. Os outros pescadores receberam um aviso no sino.');
      await queryClient.invalidateQueries({ queryKey: ['community-reports'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const vote = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: 'confirm' | 'contest' }) =>
      kind === 'confirm' ? confirmReport(id) : contestReport(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['community-reports'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: async () => {
      setPendingDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ['community-reports'] });
    },
  });

  function requestCreate(next: PendingCreate) {
    setSentMessage(null);
    setPendingDeleteId(null);
    setPendingCreate(next);
  }

  function requestDelete(id: string) {
    setPendingCreate(null);
    setPendingDeleteId(id);
  }

  const pendingDelete = reports.data?.find((item) => item.id === pendingDeleteId);
  const pendingDeleteLabel = pendingDelete
    ? (shortcutForComment(pendingDelete.comment)?.label ?? typeLabel[pendingDelete.type])
    : null;

  const usedToday = new Set(
    (reports.data ?? [])
      .filter((item) => item.isMine && isSameCalendarDay(item.createdAt))
      .map((item) => reportKey(item.type, item.comment)),
  );
  const customUsed = usedToday.has(reportKey(type, comment));
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
              Escolha o relato e confirme o envio. Os outros pescadores recebem um aviso no sino.
            </p>
          </div>
          <div className={styles.shortcuts} role="group" aria-label="Atalhos de relato">
            {reportShortcuts.map((shortcut) => {
              const Icon = shortcutIcons[shortcut.id];
              const alreadySent = usedToday.has(reportKey(shortcut.type, shortcut.comment));
              const selected =
                pendingCreate?.reportType === shortcut.type &&
                pendingCreate.reportComment === shortcut.comment;
              return (
                <button
                  key={shortcut.id}
                  type="button"
                  className={`${styles.shortcut} ${styles[shortcut.tone]} ${selected ? styles.shortcutSelected : ''}`}
                  onClick={() =>
                    requestCreate({
                      reportType: shortcut.type,
                      reportComment: shortcut.comment,
                      label: shortcut.label,
                    })
                  }
                  disabled={create.isPending || alreadySent}
                  aria-pressed={selected}
                  aria-label={
                    alreadySent
                      ? `Você já relatou ${shortcut.label} hoje neste local`
                      : `Relatar ${shortcut.label}`
                  }
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
          {sentMessage ? (
            <p className={styles.success} role="status">
              {sentMessage}
            </p>
          ) : null}
          {customUsed ? <p>Você já enviou este relato hoje neste local.</p> : null}
          <Button
            type="button"
            onClick={() =>
              requestCreate({
                reportType: type,
                reportComment: comment.trim() || undefined,
                label: comment.trim() || typeLabel[type],
              })
            }
            disabled={create.isPending || customUsed}
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
                <span className={styles.author}>
                  {report.isMine ? 'Você' : report.authorName} ·{' '}
                  <time dateTime={report.createdAt}>{formatDateTime(report.createdAt)}</time>
                </span>
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
                      onClick={() => requestDelete(report.id)}
                      disabled={remove.isPending}
                    >
                      Apagar
                    </Button>
                  </div>
                ) : canVote ? (
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
                ) : (
                  <div className={styles.votes}>
                    <Button type="button" locked aria-label="Confirmar bloqueado no plano atual">
                      <Lock size={16} aria-hidden="true" />
                      Confirmar
                    </Button>
                    <Button type="button" locked aria-label="Contestar bloqueado no plano atual">
                      <Lock size={16} aria-hidden="true" />
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
      {pendingCreate ? (
        <ReportConfirmDrawer
          title="Enviar relato"
          description={`Enviar “${pendingCreate.label}” neste local? Os outros pescadores receberão um aviso no sino.`}
          confirmLabel="Confirmar envio"
          busy={create.isPending}
          onCancel={() => {
            if (!create.isPending) setPendingCreate(null);
          }}
          onConfirm={() =>
            create.mutate({
              reportType: pendingCreate.reportType,
              reportComment: pendingCreate.reportComment,
            })
          }
        />
      ) : null}
      {pendingDelete && pendingDeleteLabel ? (
        <ReportConfirmDrawer
          title="Apagar relato"
          description={`Apagar “${pendingDeleteLabel}”? Ele some para toda a comunidade.`}
          confirmLabel="Confirmar exclusão"
          busy={remove.isPending}
          onCancel={() => {
            if (!remove.isPending) setPendingDeleteId(null);
          }}
          onConfirm={() => remove.mutate(pendingDelete.id)}
        />
      ) : null}
    </section>
  );
}
