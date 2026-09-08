import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgePercent, Handshake, Shield, Users } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { locationsQueryKey } from '@/features/locations/hooks/useLocationMutations';
import {
  platformSettingsQueryKey,
  usePlatformSettings,
} from '@/features/partners/hooks/usePartners';
import { setPlatformShowLiveWebcams } from '@/features/partners/services/partnersService';
import formStyles from '@/features/locations/components/spotForm.module.css';
import { PageHeader } from '@/pages/shared/PageHeader';
import { ApiError } from '@/shared/api/errors';
import { routes } from '@/shared/constants/routes';
import adminStyles from './admin.module.css';
import styles from '@/pages/shared/pages.module.css';

export function AdminHomePage() {
  const settings = usePlatformSettings();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const toggleLiveWebcams = useMutation({
    mutationFn: (showLiveWebcams: boolean) => setPlatformShowLiveWebcams(showLiveWebcams),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: platformSettingsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['webcam'] }),
        queryClient.invalidateQueries({ queryKey: locationsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['location-forecast'] }),
      ]);
      setError(null);
      showSaveConfirmation('Câmeras ao vivo atualizadas.');
    },
    onError: (cause) => {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Não foi possível atualizar as câmeras ao vivo.',
      );
    },
  });

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Administração"
        title="Quem entra e o que a comunidade publica."
        description="Locais compartilhados, contas, planos e parceiros."
      />
      <label className={formStyles.choice}>
        <input
          type="checkbox"
          checked={settings.data?.showLiveWebcams === true}
          disabled={settings.isPending || toggleLiveWebcams.isPending}
          onChange={(event) => toggleLiveWebcams.mutate(event.target.checked)}
        />
        <span>
          Mostrar câmeras ao vivo
          <small>
            Quando ligado, o plano Capitão vê as transmissões vinculadas. Admin continua pesquisando
            e vinculando com a opção desligada.
          </small>
        </span>
      </label>
      {error ? <p className={formStyles.error}>{error}</p> : null}
      <section className={adminStyles.shortcuts} aria-label="Áreas administrativas">
        <Link className={adminStyles.shortcut} to={routes.adminSpots}>
          <span>
            <Shield size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>Moderação</strong>
            <small>Aprove ou recuse locais compartilhados.</small>
          </div>
        </Link>
        <Link className={adminStyles.shortcut} to={routes.adminUsers}>
          <span>
            <Users size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>Usuários</strong>
            <small>Troque o plano ou bloqueie uma conta.</small>
          </div>
        </Link>
        <Link className={adminStyles.shortcut} to={routes.adminPlans}>
          <span>
            <BadgePercent size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>Planos</strong>
            <small>Preço, cotas e módulos da assinatura.</small>
          </div>
        </Link>
        <Link className={adminStyles.shortcut} to={routes.adminPartners}>
          <span>
            <Handshake size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>Parceiros</strong>
            <small>Cadastre landings da vitrine.</small>
          </div>
        </Link>
      </section>
    </div>
  );
}
