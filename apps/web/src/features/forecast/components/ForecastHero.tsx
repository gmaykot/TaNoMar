import { ArrowRight, Clock3, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/design-system/components/Badge';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import type { ForecastRankingItem } from '@/features/fishing/types/fishing';
import { MetricGrid } from './MetricGrid';
import styles from './forecast.module.css';

interface ForecastHeroProps {
  forecast: ForecastRankingItem;
}

export function ForecastHero({ forecast }: ForecastHeroProps) {
  return (
    <article className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.heroTopline}>
        <span className={styles.heroLabel}>
          <MapPin size={16} aria-hidden="true" /> Melhor escolha agora
        </span>
        <Badge classification={forecast.classification} />
      </div>
      <div className={styles.heroMain}>
        <div>
          <p className={styles.heroEyebrow}>Hoje o mar aponta para</p>
          <h2>{forecast.locationName}</h2>
          <div className={styles.window}>
            <Clock3 size={18} aria-hidden="true" />
            Melhor janela <strong>{forecast.bestWindow}</strong>
          </div>
        </div>
        <ScoreIndicator score={forecast.score} classification={forecast.classification} />
      </div>
      <MetricGrid metrics={forecast.metrics} limit={4} />
      <Link className={styles.heroLink} to={`/locais/${forecast.locationId}`}>
        Ver previsão completa <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}
