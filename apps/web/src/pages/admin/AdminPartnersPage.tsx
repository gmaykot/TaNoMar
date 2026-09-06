import { ArrowLeft, Handshake, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminPartnersQueryKey,
  platformSettingsQueryKey,
  useAdminPartners,
  usePlatformSettings,
} from '@/features/partners/hooks/usePartners';
import {
  deleteAdminPartner,
  setPlatformShowPartners,
} from '@/features/partners/services/partnersService';
import { partnerCategoryLabel } from '@/features/partners/types/partner';
import partnerStyles from '@/features/partners/components/partners.module.css';
import formStyles from '@/features/locations/components/spotForm.module.css';
import { PageHeader } from '@/pages/shared/PageHeader';
import { ApiError } from '@/shared/api/errors';
import { routes } from '@/shared/constants/routes';
import { useState } from 'react';
import styles from '@/pages/shared/pages.module.css';

export function AdminPartnersPage() {
  const partners = useAdminPartners();
  const settings = usePlatformSettings();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const remove = useMutation({
    mutationFn: deleteAdminPartner,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminPartnersQueryKey });
      setError(null);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : 'Não foi possível remover o parceiro.');
    },
  });
  const toggleVitrine = useMutation({
    mutationFn: (showPartners: boolean) => setPlatformShowPartners(showPartners),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: platformSettingsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['partners'] }),
      ]);
      setError(null);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : 'Não foi possível atualizar a vitrine.');
    },
  });

  if (partners.isPending) {
    return (
      <FeedbackState
        title="Parceiros"
        description="Carregando as landings cadastradas."
        icon={Handshake}
        busy
      />
    );
  }
  if (partners.isError) {
    return (
      <FeedbackState
        title="Parceiros indisponíveis"
        description="Não foi possível carregar o cadastro."
      />
    );
  }

  const items = partners.data ?? [];

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.admin}>
        <ArrowLeft size={16} aria-hidden="true" />
        Administração
      </Link>
      <PageHeader
        eyebrow="Administração"
        title="Parceiros da vitrine."
        description="Cadastre, publique e destaque. Ligue a vitrine para o pescador ver o menu e /parceiros."
      />
      <label className={formStyles.choice}>
        <input
          type="checkbox"
          checked={settings.data?.showPartners === true}
          disabled={settings.isPending || toggleVitrine.isPending}
          onChange={(event) => toggleVitrine.mutate(event.target.checked)}
        />
        <span>
          Mostrar vitrine de parceiros
          <small>Quando ligado, pescadores autenticados veem o atalho e o diretório.</small>
        </span>
      </label>
      <div className={styles.pageHeaderActions}>
        <Link className={styles.backLink} to={routes.adminPartnerNew}>
          <Plus size={16} aria-hidden="true" /> Novo parceiro
        </Link>
      </div>
      {error ? <p className={partnerStyles.adminMeta}>{error}</p> : null}
      {items.length === 0 ? (
        <FeedbackState
          title="Nenhum parceiro ainda"
          description="Cadastre o primeiro para revisar a landing antes de ligar a vitrine."
          icon={Handshake}
        />
      ) : (
        <div className={styles.locationGrid}>
          {items.map((partner) => (
            <Card as="article" key={partner.slug} className={partnerStyles.adminCard}>
              <div>
                <strong>{partner.name}</strong>
                <p className={partnerStyles.adminMeta}>
                  {partnerCategoryLabel[partner.category]}
                  {partner.city ? ` · ${partner.city}` : ''}
                  {partner.isPublished ? ' · Publicado' : ' · Rascunho'}
                  {partner.isFeatured ? ' · Destaque' : ''}
                </p>
              </div>
              <div className={partnerStyles.adminActions}>
                <Link className={styles.backLink} to={routes.adminPartnerEdit(partner.slug)}>
                  Editar
                </Link>
                {partner.isPublished ? (
                  <Link className={styles.backLink} to={routes.partnerDetails(partner.slug)}>
                    Ver landing
                  </Link>
                ) : null}
                <Button
                  type="button"
                  variant="quiet"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Remover ${partner.name}?`)) remove.mutate(partner.slug);
                  }}
                >
                  Remover
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
