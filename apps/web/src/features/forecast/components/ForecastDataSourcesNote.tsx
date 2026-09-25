import { ChevronDown } from 'lucide-react';
import styles from './forecast.module.css';

interface ForecastDataSourcesNoteProps {
  tideAttribution?: string | null;
  showTideReferenceNote?: boolean;
}

export function ForecastDataSourcesNote({
  tideAttribution,
  showTideReferenceNote = false,
}: ForecastDataSourcesNoteProps) {
  return (
    <footer className={styles.dataSourcesFoot}>
      <details className={styles.dataSourcesNote}>
        <summary>
          <span>Fontes da previsão</span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <div className={styles.dataSourcesNoteBody}>
          <p>Atualização: não informada pela fonte.</p>
          <p>Tempo e condições do mar: Open-Meteo.</p>
          {tideAttribution ? <p>Maré: {tideAttribution}</p> : null}
          {showTideReferenceNote ? (
            <p>
              Referência da estação de maré; não é medição exata no local. Não usar para navegação.
            </p>
          ) : null}
        </div>
      </details>
    </footer>
  );
}