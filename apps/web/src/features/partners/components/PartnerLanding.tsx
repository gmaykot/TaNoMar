import { Globe, Instagram, MapPin, MessageCircle, Sparkles } from 'lucide-react';
import type { Partner } from '../types/partner';
import { partnerCategoryLabel } from '../types/partner';
import { instagramHref, whatsAppHref } from '../utils/partnerLinks';
import { formatDateTime } from '@/shared/utils/formatDateTime';
import styles from './partners.module.css';

function primaryContact(partner: Partner) {
  if (partner.whatsApp)
    return { href: whatsAppHref(partner.whatsApp), label: 'Falar no WhatsApp', icon: MessageCircle };
  if (partner.instagram)
    return { href: instagramHref(partner.instagram), label: 'Abrir Instagram', icon: Instagram };
  if (partner.website) return { href: partner.website, label: 'Abrir o site', icon: Globe };
  if (partner.mapsUrl) return { href: partner.mapsUrl, label: 'Como chegar', icon: MapPin };
  return null;
}

function extraContacts(partner: Partner, primaryLabel: string | undefined) {
  return [
    partner.whatsApp && primaryLabel !== 'Falar no WhatsApp'
      ? { href: whatsAppHref(partner.whatsApp), label: 'WhatsApp', icon: MessageCircle }
      : null,
    partner.instagram && primaryLabel !== 'Abrir Instagram'
      ? { href: instagramHref(partner.instagram), label: 'Instagram', icon: Instagram }
      : null,
    partner.website && primaryLabel !== 'Abrir o site'
      ? { href: partner.website, label: 'Site', icon: Globe }
      : null,
    partner.mapsUrl && primaryLabel !== 'Como chegar'
      ? { href: partner.mapsUrl, label: 'Como chegar', icon: MapPin }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);
}

export function PartnerLanding({ partner }: { partner: Partner }) {
  const primary = primaryContact(partner);
  const PrimaryIcon = primary?.icon;
  const extras = extraContacts(partner, primary?.label);

  return (
    <article className={styles.landing}>
      <header className={styles.landingHero}>
        {partner.coverImageUrl ? (
          <img className={styles.landingCover} src={partner.coverImageUrl} alt="" />
        ) : null}
        <div className={styles.landingIntro}>
          <span>
            {partner.isFeatured ? (
              <>
                <Sparkles size={14} aria-hidden="true" /> Destaque ·{' '}
              </>
            ) : null}
            {partnerCategoryLabel[partner.category]}
          </span>
          <h1>{partner.name}</h1>
          <p>
            <MapPin size={15} aria-hidden="true" /> {partner.city || 'Florianópolis'}
            {partner.tagline ? ` · ${partner.tagline}` : ''}
          </p>
        </div>
        {primary && PrimaryIcon ? (
          <a className={styles.landingCta} href={primary.href} rel="noreferrer" target="_blank">
            <PrimaryIcon size={18} aria-hidden="true" />
            {primary.label}
          </a>
        ) : null}
      </header>

      {partner.about ? (
        <section className={styles.landingBlock} aria-labelledby="partner-about">
          <h2 id="partner-about">Sobre</h2>
          <p>{partner.about}</p>
        </section>
      ) : null}

      {partner.offers.length > 0 ? (
        <section className={styles.landingBlock} aria-labelledby="partner-offers">
          <h2 id="partner-offers">O que oferece</h2>
          <ul className={styles.offerList}>
            {partner.offers.map((offer) => (
              <li key={`${offer.title}-${offer.priceLabel ?? ''}`}>
                <div>
                  <strong>{offer.title}</strong>
                  {offer.priceLabel ? <small>{offer.priceLabel}</small> : null}
                </div>
                {offer.description ? <p>{offer.description}</p> : null}
                {offer.endsAt ? <p>Até {formatDateTime(offer.endsAt)}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {extras.length > 0 ? (
        <nav className={styles.landingContacts} aria-label="Outros contatos">
          {extras.map((item) => {
            const Icon = item.icon;
            return (
              <a key={item.label} href={item.href} rel="noreferrer" target="_blank">
                <Icon size={18} aria-hidden="true" /> {item.label}
              </a>
            );
          })}
        </nav>
      ) : null}

      <p className={styles.landingNote}>
        O TáNoMar só apresenta o parceiro. Valores, horários e reservas são com ele — o app não
        intermedia pagamento.
      </p>
    </article>
  );
}
