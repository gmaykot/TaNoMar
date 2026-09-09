import { useState } from 'react';
import { Video } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { useSpotWebcam } from '../hooks/useSpotWebcam';
import type { SpotWebcam } from '../types/webcam';
import { WebcamDisclaimer } from './WebcamDisclaimer';
import { WebcamPlayer } from './WebcamPlayer';
import { WebcamThumb } from './WebcamThumb';
import styles from './webcam.module.css';

interface WebcamCardProps {
  webcam: SpotWebcam;
  heading?: string;
}

export function WebcamCard({ webcam, heading = 'Ao vivo' }: WebcamCardProps) {
  const [open, setOpen] = useState(false);
  const name = webcam.name ?? 'Câmera ao vivo';
  const canPlay = webcam.isAvailable && webcam.player?.embedUrl;

  return (
    <Card as="section" className={styles.card} elevated>
      <WebcamDisclaimer />
      <div className={styles.header}>
        <div>
          <span className={styles.meta}>
            <Video size={14} aria-hidden="true" /> {heading}
          </span>
          <h2>{name}</h2>
        </div>
        <span className={`${styles.status} ${canPlay ? '' : styles.statusOff}`}>
          <span className={styles.dot} aria-hidden="true" />
          {canPlay ? 'Disponível' : 'Indisponível'}
        </span>
      </div>
      {webcam.linked ? (
        <WebcamThumb webcam={webcam} onOpen={canPlay ? () => setOpen(true) : undefined} />
      ) : null}
      {canPlay ? (
        <div className={styles.actions}>
          <Button type="button" onClick={() => setOpen(true)}>
            Ver câmera ao vivo
          </Button>
        </div>
      ) : (
        <p className={styles.copy}>A câmera vinculada não está disponível agora.</p>
      )}
      {open && webcam.player ? (
        <WebcamPlayer
          title={name}
          embedUrl={webcam.player.embedUrl}
          expanded
          onClose={() => setOpen(false)}
        />
      ) : null}
    </Card>
  );
}

export function WebcamLiveView({ spotId }: { spotId: string }) {
  const webcams = useSpotWebcam(spotId, { admin: false });
  if (webcams.webcam.isPending) {
    return (
      <FeedbackState
        title="Câmera ao vivo"
        description="Carregando a transmissão vinculada a este local."
        icon={Video}
        busy
      />
    );
  }
  if (webcams.webcam.isError) {
    return (
      <FeedbackState
        title="Câmera indisponível"
        description="Não foi possível consultar as câmeras agora. Tente novamente em alguns minutos."
        icon={Video}
      />
    );
  }
  const webcam = webcams.webcam.data;
  if (!webcam?.linked) return null;
  return <WebcamCard webcam={webcam} />;
}
