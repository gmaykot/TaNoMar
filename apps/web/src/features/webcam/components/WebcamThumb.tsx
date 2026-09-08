import { Video } from 'lucide-react';
import { webcamPreviewUrl } from '../mappers/webcamMapper';
import type { SpotWebcam } from '../types/webcam';
import styles from './webcam.module.css';

interface WebcamThumbProps {
  webcam: SpotWebcam;
  onOpen?: () => void;
}

export function WebcamThumb({ webcam, onOpen }: WebcamThumbProps) {
  const previewUrl = webcamPreviewUrl(webcam);
  const name = webcam.name ?? 'Câmera ao vivo';
  const canPlay = Boolean(webcam.isAvailable && webcam.player?.embedUrl && onOpen);
  const media = previewUrl ? (
    <img className={styles.thumbImage} src={previewUrl} alt="" />
  ) : (
    <span className={styles.thumbFallback} aria-hidden="true">
      <Video size={28} />
    </span>
  );

  if (!canPlay) {
    return <div className={`${styles.thumb} ${styles.thumbOff}`}>{media}</div>;
  }

  return (
    <button
      type="button"
      className={styles.thumb}
      onClick={onOpen}
      aria-label={`Ver câmera ao vivo: ${name}`}
    >
      {media}
      <span className={styles.thumbPlay} aria-hidden="true">
        <Video size={18} />
      </span>
    </button>
  );
}
