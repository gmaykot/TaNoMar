import styles from './webcam.module.css';

export function WebcamDisclaimer() {
  return (
    <p className={styles.disclaimer}>
      A transmissão é de terceiros: o TáNoMar apenas a exibe. Não se responsabiliza pelas imagens
      nem pelo conteúdo, e não garante manutenção nem disponibilidade da câmera.
    </p>
  );
}
