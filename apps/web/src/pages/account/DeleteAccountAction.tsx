import { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { ConfirmDrawer } from '@/design-system/components/ConfirmDrawer';
import {
  deleteCurrentUser,
  prepareCurrentUserDeletion,
  type AccountDeletionPreparation,
} from '@/features/auth/services/authService';
import { clearDiaryStorage } from '@/features/diary/diaryStorage';
import { ApiError } from '@/shared/api/errors';
import accountStyles from './account.module.css';

export function DeleteAccountAction({ onDeleted }: { onDeleted: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preparation, setPreparation] = useState<AccountDeletionPreparation | null>(null);
  const [result, setResult] = useState<{
    status: string;
    detail: string;
    protocol: string;
    statusUrl: string;
    supportChannel: string;
  } | null>(null);

  async function finishDeletion() {
    if (!preparation) return;
    setBusy(true);
    setError('');
    try {
      const deletion = await deleteCurrentUser(preparation.protocol);
      clearDiaryStorage();
      setResult(deletion);
      setPreparation(null);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (caught.detail ?? caught.message)
          : 'Não foi possível excluir a conta. Tente de novo com o mesmo protocolo.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="quiet"
        onClick={() => {
          setError('');
          setOpen(true);
        }}
      >
        Excluir conta
      </Button>
      {error ? (
        <p className={accountStyles.note} role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className={accountStyles.note} role="status">
          <p>{result.detail}</p>
          <p>
            Protocolo: <strong>{result.protocol}</strong>
          </p>
          {result.status !== 'completed' ? (
            <p>
              Acompanhe em <a href={result.statusUrl}>{result.statusUrl}</a> ou fale com{' '}
              <a href={`mailto:${result.supportChannel}`}>{result.supportChannel}</a>.
            </p>
          ) : null}
          <Button onClick={() => void onDeleted()}>Encerrar sessão</Button>
        </div>
      ) : null}
      {preparation ? (
        <div className={accountStyles.note} role="status">
          <p>Guarde o protocolo antes de continuar:</p>
          <p>
            <strong>{preparation.protocol}</strong>
          </p>
          <p>
            Ele permite acompanhar o encerramento em{' '}
            <a href={preparation.statusUrl}>{preparation.statusUrl}</a> ou pedir ajuda em{' '}
            <a href={`mailto:${preparation.supportChannel}`}>{preparation.supportChannel}</a>, mesmo
            se a resposta da exclusão se perder.
          </p>
          <Button disabled={busy} onClick={() => void finishDeletion()}>
            {busy ? 'Excluindo…' : 'Excluir conta agora'}
          </Button>
        </div>
      ) : null}
      {open ? (
        <ConfirmDrawer
          title="Excluir conta?"
          description="O TáNoMar solicitará ao Asaas o encerramento da recorrência. Se a confirmação não chegar, a exclusão continuará e o cancelamento ficará pendente, com novas tentativas automáticas. Locais pessoais e compartilhados, preferências, sessões e o CPF guardado no TáNoMar somem. Locais oficiais permanecem. Esta ação não tem volta."
          confirmLabel="Gerar protocolo"
          busy={busy}
          onCancel={() => {
            if (!busy) setOpen(false);
          }}
          onConfirm={() => {
            void (async () => {
              setBusy(true);
              setError('');
              try {
                const deletionPreparation = await prepareCurrentUserDeletion();
                setBusy(false);
                setOpen(false);
                setPreparation(deletionPreparation);
              } catch (caught) {
                setBusy(false);
                setOpen(false);
                setError(
                  caught instanceof ApiError
                    ? (caught.detail ?? caught.message)
                    : 'Não foi possível excluir a conta. Tente de novo.',
                );
              }
            })();
          }}
        />
      ) : null}
    </>
  );
}
