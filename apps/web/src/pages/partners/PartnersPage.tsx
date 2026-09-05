import { Handshake } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { showsPartners } from '@/features/auth/types/auth';
import { PartnerCard } from '@/features/partners/components/PartnerCard';
import { usePartners } from '@/features/partners/hooks/usePartners';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

export function PartnersPage() {
  const auth = useAuth();
  const enabled = showsPartners(auth.user);
  const partners = usePartners(enabled);

  if (!enabled) return <Navigate to={routes.home} replace />;

  if (partners.isPending) {
    return (
      <FeedbackState
        title="Abrindo os parceiros"
        description="Carregando lojas e guias da ilha."
        icon={Handshake}
        busy
      />
    );
  }
  if (partners.isError) {
    return (
      <FeedbackState
        title="Parceiros indisponíveis"
        description="Não foi possível carregar as parcerias."
      />
    );
  }

  const items = partners.data ?? [];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Parceiros"
        title="Quem ajuda a ir ao mar."
        description="Lojas, guias e serviços da ilha. O TáNoMar não vende nem intermedia."
      />
      {items.length === 0 ? (
        <FeedbackState
          title="Em breve, lojas e guias da ilha."
          description="Quando houver um parceiro publicado, ele aparece aqui."
          icon={Handshake}
        />
      ) : (
        <div className={styles.locationGrid}>
          {items.map((partner) => (
            <PartnerCard key={partner.slug} partner={partner} />
          ))}
        </div>
      )}
    </div>
  );
}
