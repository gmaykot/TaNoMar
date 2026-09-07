import { ArrowRight, Clock3, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/design-system/components/Badge';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import type { FishingMetricKey, ForecastRankingItem } from '@/features/fishing/types/fishing';
import { OwnerBadge } from '@/features/locations/components/OwnerBadge';
import { MetricGrid } from './MetricGrid';
import styles from './forecast.module.css';

interface ForecastHeroProps {
  forecast: ForecastRankingItem;
  date?: string;
  dayLabel?: string;
  generatedAt?: string;
  visibleMetricKeys?: FishingMetricKey[];
  windUnit?: string;
}

export function ForecastHero({
  forecast,
  date,
  dayLabel = 'Hoje',
  generatedAt,
  visibleMetricKeys,
  windUnit,
}: ForecastHeroProps) {
  return (
    <article className={styles.hero}>
      {forecast.isOwner ? <OwnerBadge /> : null}
      <div className={styles.heroDecor} aria-hidden="true">
        <div className={styles.heroGlow} />
      </div>
      <div className={styles.heroTopline}>
        <span className={styles.heroLabel}>
          <MapPin size={16} aria-hidden="true" /> Melhor escolha · {dayLabel}
        </span>
        <Badge classification={forecast.classification} />
      </div>
      <div className={styles.heroMain}>
        <div>
          <p className={styles.heroEyebrow}>{dayLabel} o mar aponta para</p>
          <h2>{forecast.locationName}</h2>
          <div className={styles.window}>
            <Clock3 size={18} aria-hidden="true" />
            Melhor janela <strong>{forecast.bestWindow}</strong>
          </div>
        </div>
        <ScoreIndicator score={forecast.score} classification={forecast.classification} />
      </div>
      {forecast.highlights?.length ? (
        <ul className={styles.heroHighlights} aria-label="Por que este local foi recomendado">
          {forecast.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
        </ul>
      ) : null}
      <MetricGrid
        metrics={forecast.metrics}
        keys={visibleMetricKeys}
        limit={4}
        windUnit={windUnit}
      />
      {generatedAt ? (
        <p className={styles.heroFreshness}>Previsão atualizada em {generatedAt}</p>
      ) : null}
      <Link
        className={`${styles.heroLink} ${styles.hit}`}
        to={`/locais/${forecast.locationId}${date ? `?data=${encodeURIComponent(date)}` : ''}`}
      >
        Ver previsão completa <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}
