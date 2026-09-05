import { ArrowLeft, Handshake, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPartnersQueryKey, useAdminPartners } from '@/features/partners/hooks/usePartners';
import { deleteAdminPartner } from '@/features/partners/services/partnersService';
import { partnerCategoryLabel } from '@/features/partners/types/partner';
import partnerStyles from '@/features/partners/components/partners.module.css';
import { PageHeader } from '@/pages/shared/PageHeader';
import { ApiError } from '@/shared/api/errors';
import { routes } from '@/shared/constants/routes';
import { useState } from 'react';
import styles from '@/pages/shared/pages.module.css';

export function AdminPartnersPage() {
  const partners = useAdminPartners();
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
        description="Cadastre, publique e destaque. A vitrine só aparece com ShowPartners ligado."
      />
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
