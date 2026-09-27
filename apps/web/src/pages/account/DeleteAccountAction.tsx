import { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { ConfirmDrawer } from '@/design-system/components/ConfirmDrawer';
import { deleteCurrentUser } from '@/features/auth/services/authService';
import { clearDiaryStorage } from '@/features/diary/diaryStorage';
import { ApiError } from '@/shared/api/errors';
import accountStyles from './account.module.css';

export function DeleteAccountAction({ onDeleted }: { onDeleted: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ status: string; detail: string } | null>(null);

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
          {result.status !== 'completed' ? (
            <p>Guarde esta informação: a recorrência ainda está em acompanhamento.</p>
          ) : null}
          <Button onClick={() => void onDeleted()}>Encerrar sessão</Button>
        </div>
      ) : null}
      {open ? (
        <ConfirmDrawer
          title="Excluir conta?"
          description="O TáNoMar solicitará ao Asaas o encerramento da recorrência. Se a confirmação não chegar, a exclusão continuará e o cancelamento ficará pendente, com novas tentativas automáticas. Locais pessoais e compartilhados, preferências, sessões e o CPF guardado no TáNoMar somem. Locais oficiais permanecem. Esta ação não tem volta."
          confirmLabel="Excluir conta"
          busy={busy}
          onCancel={() => {
            if (!busy) setOpen(false);
          }}
          onConfirm={() => {
            void (async () => {
              setBusy(true);
              setError('');
              try {
                const deletion = await deleteCurrentUser();
                clearDiaryStorage();
                setBusy(false);
                setOpen(false);
                setResult(deletion);
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
