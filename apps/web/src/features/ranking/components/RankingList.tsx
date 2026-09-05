import { ChevronDown, Clock3, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/design-system/components/Badge';
import { Card } from '@/design-system/components/Card';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import type { ForecastRankingItem } from '@/features/fishing/types/fishing';
import { MetricGrid } from '@/features/forecast/components/MetricGrid';
import styles from './ranking.module.css';

interface RankingListProps {
  items: ForecastRankingItem[];
  limit?: number;
}

export function RankingList({ items, limit }: RankingListProps) {
  const visibleItems = typeof limit === 'number' ? items.slice(0, limit) : items;
  return (
    <div className={styles.list}>
      {visibleItems.map((item, index) => (
        <Card as="article" className={styles.item} key={item.locationId}>
          <div className={styles.summary}>
            <span className={styles.position} aria-label={`${index + 1}º lugar`}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className={styles.info}>
              <Badge classification={item.classification} />
              <Link to={`/locais/${item.locationId}`}>
                <h3>{item.locationName}</h3>
              </Link>
              <p>
                <Clock3 size={15} aria-hidden="true" /> {item.bestWindow}
              </p>
            </div>
            <ScoreIndicator score={item.score} classification={item.classification} size="small" />
          </div>
          <details className={styles.details}>
            <summary>
              Ver condições <ChevronDown size={17} aria-hidden="true" />
            </summary>
            <MetricGrid metrics={item.metrics} />
            <Link className={styles.locationLink} to={`/locais/${item.locationId}`}>
              <MapPin size={16} aria-hidden="true" /> Abrir local
            </Link>
          </details>
        </Card>
      ))}
    </div>
  );
}
