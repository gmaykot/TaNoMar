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
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
