import { ArrowLeft, Handshake, Instagram, MapPin, MessageCircle, Globe } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Card } from '@/design-system/components/Card';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { showsPartners } from '@/features/auth/types/auth';
import { usePartner } from '@/features/partners/hooks/usePartners';
import { instagramHref, whatsAppHref } from '@/features/partners/utils/partnerLinks';
import { partnerCategoryLabel } from '@/features/partners/types/partner';
import partnerStyles from '@/features/partners/components/partners.module.css';
import { PageHeader } from '@/pages/shared/PageHeader';
import { formatDateTime } from '@/shared/utils/formatDateTime';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

export function PartnerDetailsPage() {
  const { partnerSlug = '' } = useParams();
  const auth = useAuth();
  const enabled = showsPartners(auth.user);
  const partner = usePartner(partnerSlug, enabled);

  if (!enabled) return <Navigate to={routes.home} replace />;

  if (partner.isPending) {
    return (
      <FeedbackState
        title="Abrindo o parceiro"
        description="Carregando a landing."
        icon={Handshake}
        busy
      />
    );
  }
  if (partner.isError || !partner.data) {
    return (
      <FeedbackState
        title="Parceiro não encontrado"
        description="Essa página não está publicada ou o endereço mudou."
      />
    );
  }

  const item = partner.data;

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.partners}>
        <ArrowLeft size={18} aria-hidden="true" /> Voltar aos parceiros
      </Link>
      <PageHeader
        eyebrow={item.isFeatured ? 'Destaque' : partnerCategoryLabel[item.category]}
        title={item.name}
        description={item.tagline ?? item.city}
      />
      {item.about ? (
        <Card as="section" className={partnerStyles.hero}>
          <h2>Sobre</h2>
          <p>{item.about}</p>
        </Card>
      ) : null}
      {item.offers.length > 0 ? (
        <Card as="section" className={partnerStyles.hero}>
          <h2>O que oferece</h2>
          <div className={partnerStyles.offers}>
            {item.offers.map((offer) => (
              <article
                key={`${offer.title}-${offer.priceLabel ?? ''}`}
                className={partnerStyles.offer}
              >
                <strong>{offer.title}</strong>
                {offer.priceLabel ? <small>{offer.priceLabel}</small> : null}
                {offer.description ? <p>{offer.description}</p> : null}
                {offer.endsAt ? <p>Até {formatDateTime(offer.endsAt)}</p> : null}
              </article>
            ))}
          </div>
        </Card>
      ) : null}
      <Card as="section" className={partnerStyles.hero}>
        <h2>Falar com o parceiro</h2>
        <div className={partnerStyles.contact}>
          {item.whatsApp ? (
            <a href={whatsAppHref(item.whatsApp)} rel="noreferrer" target="_blank">
              <MessageCircle size={18} aria-hidden="true" /> Falar no WhatsApp
            </a>
          ) : null}
          {item.instagram ? (
            <a href={instagramHref(item.instagram)} rel="noreferrer" target="_blank">
              <Instagram size={18} aria-hidden="true" /> Instagram
            </a>
          ) : null}
          {item.website ? (
            <a href={item.website} rel="noreferrer" target="_blank">
              <Globe size={18} aria-hidden="true" /> Site
            </a>
          ) : null}
          {item.mapsUrl ? (
            <a href={item.mapsUrl} rel="noreferrer" target="_blank">
              <MapPin size={18} aria-hidden="true" /> Como chegar
            </a>
          ) : null}
        </div>
      </Card>
      <Card as="section" className={partnerStyles.notice}>
        <h2>O TáNoMar não vende</h2>
        <p>
          Esta página só apresenta o parceiro. Valores e promoções são de responsabilidade dele. O
          aplicativo não intermedia pagamento nem reserva.
        </p>
      </Card>
    </div>
  );
}
