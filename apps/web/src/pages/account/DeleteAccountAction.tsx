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
      {open ? (
        <ConfirmDrawer
          title="Excluir conta?"
          description="A assinatura deixa de renovar agora e o período já pago acaba com a conta, sem estorno. Locais pessoais e compartilhados, preferências, sessões e o CPF guardado no TáNoMar somem. Locais oficiais permanecem. Esta ação não tem volta."
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
                await deleteCurrentUser();
                clearDiaryStorage();
                await onDeleted();
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
