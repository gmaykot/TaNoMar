import { ArrowUpRight, Handshake, MapPin, Sparkles, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/design-system/components/Card';
import { routes } from '@/shared/constants/routes';
import { partnerCategoryLabel, type Partner } from '../types/partner';
import styles from './partners.module.css';

export function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <Card as="article" className={styles.card}>
      <div className={styles.icon} aria-hidden={partner.coverImageUrl ? undefined : true}>
        {partner.coverImageUrl ? (
          <img src={partner.coverImageUrl} alt="" />
        ) : partner.category === 'loja' ? (
          <Store size={24} aria-hidden="true" />
        ) : (
          <Handshake size={24} aria-hidden="true" />
        )}
      </div>
      <div className={styles.content}>
        <span>
          {partner.isFeatured ? (
            <>
              <Sparkles size={12} aria-hidden="true" className={styles.featured} /> Destaque ·{' '}
            </>
          ) : null}
          {partnerCategoryLabel[partner.category]}
        </span>
        <h2>{partner.name}</h2>
        <p>
          <MapPin size={15} aria-hidden="true" /> {partner.city || 'Florianópolis'}
          {partner.tagline ? ` · ${partner.tagline}` : ''}
        </p>
      </div>
      <Link to={routes.partnerDetails(partner.slug)} aria-label={`Ver ${partner.name}`}>
        <ArrowUpRight size={20} aria-hidden="true" />
      </Link>
    </Card>
  );
}
