import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgePercent, ClipboardCheck, Handshake, MapPinned, Shield, Users } from 'lucide-react';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { locationsQueryKey } from '@/features/locations/hooks/useLocationMutations';
import {
  platformSettingsQueryKey,
  usePlatformSettings,
} from '@/features/partners/hooks/usePartners';
import {
  setPlatformShowAppFocus,
  setPlatformShowLiveWebcams,
} from '@/features/partners/services/partnersService';
import formStyles from '@/features/locations/components/spotForm.module.css';
import { PageHeader } from '@/pages/shared/PageHeader';
import { ApiError } from '@/shared/api/errors';
import { routes } from '@/shared/constants/routes';
import adminStyles from './admin.module.css';
import styles from '@/pages/shared/pages.module.css';

export function AdminHomePage() {
  const settings = usePlatformSettings();
  const queryClient = useQueryClient();
  const toggleFocus = useMutation({
    mutationFn: (showAppFocus: boolean) => setPlatformShowAppFocus(showAppFocus),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: platformSettingsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]);
      showSaveConfirmation('Configuração de perfil salva.');
    },
  });
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
      showSaveConfirmation('Câmeras ao vivo atualizadas.');
    },
  });

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Administração"
        title="Quem entra e o que a comunidade publica."
        description="Locais do sistema, moderação, contas, planos e parceiros."
      />
      <label className={formStyles.choice}>
        <input
          type="checkbox"
          checked={settings.data?.showAppFocus === true}
          disabled={settings.isPending || toggleFocus.isPending}
          onChange={(event) => toggleFocus.mutate(event.target.checked)}
        />
        <span>
          Permitir escolha de perfil
          <small>Quando desligado, o aplicativo fica no foco pesca e a opção some da conta.</small>
        </span>
      </label>
      {toggleFocus.isError ? (
        <p className={formStyles.error}>
          {toggleFocus.error instanceof ApiError
            ? toggleFocus.error.message
            : 'Não foi possível atualizar o perfil.'}
        </p>
      ) : null}
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
      {toggleLiveWebcams.isError ? (
        <p className={formStyles.error}>
          {toggleLiveWebcams.error instanceof ApiError
            ? toggleLiveWebcams.error.message
            : 'Não foi possível atualizar as câmeras ao vivo.'}
        </p>
      ) : null}
      <section className={adminStyles.shortcuts} aria-label="Áreas administrativas">
        <Link className={adminStyles.shortcut} to={routes.adminAudit}>
          <span>
            <ClipboardCheck size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>Auditoria de dados</strong>
            <small>Confira forecast, notas e fontes meteorológicas.</small>
          </div>
        </Link>
        <Link className={adminStyles.shortcut} to={routes.adminOfficialSpots}>
          <span>
            <MapPinned size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>Locais do sistema</strong>
            <small>Cadastre, habilite e marque os padrões do plano Free.</small>
          </div>
        </Link>
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
