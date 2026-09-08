import { Clock3, MapPin, Waves, Wind } from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import type { FishingClassification } from '@/features/fishing/types/fishing';
import styles from './landing.module.css';

const ranking: Array<{
  place: string;
  name: string;
  score: number;
  classification: FishingClassification;
  window: string;
  wind: string;
  waves: string;
}> = [
  {
    place: '01',
    name: 'Pântano do Sul',
    score: 9.1,
    classification: 'excellent',
    window: '05:30–08:00',
    wind: '7 km/h Leste',
    waves: '0,7 m',
  },
  {
    place: '02',
    name: 'Joaquina',
    score: 8.4,
    classification: 'very-good',
    window: '06:00–08:30',
    wind: '12 km/h Nordeste',
    waves: '1,1 m',
  },
  {
    place: '03',
    name: 'Armação',
    score: 7.6,
    classification: 'very-good',
    window: '06:30–09:00',
    wind: '9 km/h Leste',
    waves: '0,8 m',
  },
  {
    place: '04',
    name: 'Campeche',
    score: 6.2,
    classification: 'regular',
    window: '16:30–18:30',
    wind: '18 km/h Sul',
    waves: '1,4 m',
  },
];

export function ComparisonPreview() {
  return (
    <div className={styles.comparisonPreview} aria-label="Demonstração do ranking de locais">
      <div className={styles.comparisonDesktop}>
        <div className={styles.previewBar} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className={styles.comparisonContent}>
          <div className={styles.previewLabel}>
            <MapPin size={15} aria-hidden="true" /> Ranking · hoje
          </div>
          <div className={styles.comparisonDays} aria-hidden="true">
            <span className={styles.comparisonDayActive}>Hoje</span>
            <span>Amanhã</span>
            <span>+2</span>
          </div>
          <ol className={styles.comparisonList}>
            {ranking.map((item, index) => (
              <li
                className={`${styles.comparisonItem} ${index === 0 ? styles.comparisonItemLead : ''}`}
                key={item.name}
              >
                <span className={styles.comparisonPlace}>{item.place}</span>
                <div>
                  <Badge classification={item.classification} />
                  <strong>{item.name}</strong>
                  <p>
                    <Clock3 size={14} aria-hidden="true" /> {item.window}
                  </p>
                  {index === 0 ? (
                    <p>
                      <Wind size={14} aria-hidden="true" /> {item.wind}
                      <Waves size={14} aria-hidden="true" /> {item.waves}
                    </p>
                  ) : null}
                </div>
                <ScoreIndicator
                  score={item.score}
                  classification={item.classification}
                  size="small"
                />
              </li>
            ))}
          </ol>
          <small className={styles.comparisonDisclaimer}>Demonstração com dados ilustrativos</small>
        </div>
      </div>
      <div className={styles.comparisonPhone} aria-hidden="true">
        <span className={styles.phoneSpeaker} />
        <div className={styles.phoneContent}>
          <small>Comparar locais</small>
          {ranking.slice(0, 3).map((item) => (
            <span className={styles.comparisonPhoneRow} key={item.name}>
              <strong>
                {item.place} {item.name}
              </strong>
              {item.score.toFixed(1).replace('.', ',')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
