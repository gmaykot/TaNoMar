import { Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/design-system/components/Card';
import { routes } from '@/shared/constants/routes';
import styles from './webcam.module.css';

export function WebcamPremiumGate() {
  return (
    <Card as="section" className={styles.gate} aria-labelledby="webcam-premium-title">
      <span className={styles.meta}>
        <Video size={14} aria-hidden="true" /> Câmera ao vivo
      </span>
      <h2 id="webcam-premium-title">Recurso do plano Capitão</h2>
      <p className={styles.copy}>
        Este local tem uma câmera vinculada. A transmissão fica no plano Capitão.
      </p>
      <Link to={routes.premium}>Ver o plano Capitão</Link>
    </Card>
  );
}
