import { CloudRain, Clock3, MapPin, Thermometer, Waves, Wind } from 'lucide-react';
import { MetricTile } from '@/design-system/components/MetricTile';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import styles from './landing.module.css';

export function ProductPreview() {
  return (
    <div className={styles.productPreview} aria-label="Demonstração da interface do TáNoMar">
      <div className={styles.previewDesktop}>
        <div className={styles.previewBar} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className={styles.previewContent}>
          <div className={styles.previewLabel}>
            <MapPin size={15} aria-hidden="true" /> Melhor escolha · hoje
          </div>
          <div className={styles.previewSummary}>
            <div>
              <small>Hoje o mar aponta para</small>
              <h2>Pântano do Sul</h2>
              <p>
                <Clock3 size={16} aria-hidden="true" /> Melhor hora <strong>05:30</strong>
              </p>
            </div>
            <ScoreIndicator score={9.1} classification="excellent" />
          </div>
          <div className={styles.previewMetrics}>
            <MetricTile icon={Wind} label="Vento" value="7 km/h" detail="Leste" />
            <MetricTile icon={Waves} label="Ondas" value="0,7 m" />
            <MetricTile icon={CloudRain} label="Chuva" value="8%" />
            <MetricTile icon={Thermometer} label="Temperatura" value="23 °C" detail="Ar" />
          </div>
          <small className={styles.previewDisclaimer}>Demonstração com dados ilustrativos</small>
        </div>
      </div>
      <div className={styles.previewPhone} aria-hidden="true">
        <span className={styles.phoneSpeaker} />
        <div className={styles.phoneContent}>
          <small>Ranking de hoje</small>
          <strong>1º Pântano do Sul</strong>
          <span>Melhor janela · 05:30–08:00</span>
          <div className={styles.phoneScore}>9,1</div>
          <span>Vento · ondas · chuva</span>
        </div>
      </div>
    </div>
  );
}
