import styles from './webcam.module.css';

interface WebcamPlayerProps {
  title: string;
  embedUrl: string;
}

export function WebcamPlayer({ title, embedUrl }: WebcamPlayerProps) {
  return (
    <div className={styles.player}>
      <iframe
        title={`Câmera ao vivo: ${title}`}
        src={embedUrl}
        allow="fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
      />
    </div>
  );
}
