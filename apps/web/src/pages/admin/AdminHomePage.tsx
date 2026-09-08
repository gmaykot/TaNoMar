import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgePercent, Handshake, Shield, Users } from 'lucide-react';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import {
  platformSettingsQueryKey,
  usePlatformSettings,
} from '@/features/partners/hooks/usePartners';
import { setPlatformShowAppFocus } from '@/features/partners/services/partnersService';
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
