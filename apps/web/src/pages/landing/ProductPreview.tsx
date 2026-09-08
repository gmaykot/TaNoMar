import {
  Anchor,
  Clock3,
  CloudRain,
  Droplets,
  MapPin,
  Thermometer,
  Waves,
  Wind,
} from 'lucide-react';
import { MetricTile } from '@/design-system/components/MetricTile';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import { Sparkline } from '@/design-system/components/Sparkline';
import styles from './landing.module.css';

const tideCurve = [-0.04, 0.08, 0.28, 0.62, 0.98, 1.14, 0.86, 0.48, 0.21];
const swellCurve = [0.42, 0.48, 0.54, 0.52, 0.49, 0.46, 0.5];
const waterCurve = [18.4, 18.6, 19.1, 19.4, 19.0, 18.6, 18.4];

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
            <MetricTile icon={Waves} label="Ondas" value="0,7 m" detail="Sudeste" />
            <MetricTile icon={CloudRain} label="Chuva" value="8%" />
            <MetricTile icon={Thermometer} label="Temperatura" value="23 °C" detail="Ar" />
          </div>
          <div className={styles.previewMarine}>
            <p className={styles.previewMarineEyebrow}>Mar e maré</p>
            <div className={styles.previewSea}>
              <article className={styles.previewSeaCard} aria-label="Swell">
                <div>
                  <span>
                    <Waves size={15} aria-hidden="true" /> Swell
                  </span>
                  <strong>0,54 m</strong>
                  <small>Sudeste · 8,2 s</small>
                </div>
                <Sparkline values={swellCurve} label="Variação do swell" />
              </article>
              <article className={styles.previewSeaCard} aria-label="Água">
                <div>
                  <span>
                    <Droplets size={15} aria-hidden="true" /> Água
                  </span>
                  <strong>18,4 °C</strong>
                  <small>18,4–19,4 °C</small>
                </div>
                <Sparkline values={waterCurve} label="Temperatura da água" />
              </article>
            </div>
            <article className={styles.previewTide} aria-label="Maré">
              <div>
                <span>
                  <Anchor size={16} aria-hidden="true" /> Maré
                </span>
                <strong>0,18 m</strong>
                <small>Enchente</small>
              </div>
              <ul>
                <li>
                  <strong>Baixa-mar</strong>
                  <span>05:20 · −0,04 m</span>
                </li>
                <li className={styles.previewTideUpcoming}>
                  <strong>Preamar</strong>
                  <span>12:08 · 1,14 m · próxima</span>
                </li>
                <li>
                  <strong>Baixa-mar</strong>
                  <span>18:36 · 0,21 m</span>
                </li>
              </ul>
              <Sparkline values={tideCurve} label="Nível da maré" />
            </article>
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
          <span>Maré enchente · 0,18 m</span>
        </div>
      </div>
    </div>
  );
}
