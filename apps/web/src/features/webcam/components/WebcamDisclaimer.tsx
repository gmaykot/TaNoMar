import { Info } from 'lucide-react';
import styles from './webcam.module.css';

export function WebcamDisclaimer() {
  return (
    <details className={styles.disclaimer}>
      <summary aria-label="Sobre a transmissão">
        <span className={styles.disclaimerStamp}>
          <Info size={11} aria-hidden="true" />
          Info
        </span>
      </summary>
      <p>
        A transmissão é de terceiros: o TáNoMar apenas a exibe. Não se responsabiliza pelas imagens
        nem pelo conteúdo, e não garante manutenção nem disponibilidade da câmera.
      </p>
    </details>
  );
}
