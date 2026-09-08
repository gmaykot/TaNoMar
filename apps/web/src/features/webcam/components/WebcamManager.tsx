import { useState } from 'react';
import { Video } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { ConfirmDrawer } from '@/design-system/components/ConfirmDrawer';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { useSpotWebcam } from '../hooks/useSpotWebcam';
import { WebcamPlayer } from './WebcamPlayer';
import { WebcamSearch } from './WebcamSearch';
import styles from './webcam.module.css';

interface WebcamManagerProps {
  spotId: string;
  admin?: boolean;
}

export function WebcamManager({ spotId, admin = false }: WebcamManagerProps) {
  const webcams = useSpotWebcam(spotId, { admin, enabled: Boolean(spotId) });
  const [searching, setSearching] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const linked = webcams.webcam.data?.linked === true ? webcams.webcam.data : null;
  const canPlay = Boolean(linked?.isAvailable && linked.player?.embedUrl);

  function startSearch() {
    if (webcams.search.isPending) return;
    setSearching(true);
    webcams.search.mutate();
  }

  if (webcams.webcam.isPending) {
    return (
      <FeedbackState
        title="Câmera ao vivo"
        description="Verificando se este local já tem uma transmissão vinculada."
        icon={Video}
        busy
      />
    );
  }

  return (
    <Card as="section" className={styles.card}>
      <div className={styles.header}>
        <div>
          <span className={styles.meta}>
            <Video size={14} aria-hidden="true" /> Câmera ao vivo
          </span>
          <h2>{linked ? 'Câmera vinculada' : 'Nenhuma câmera vinculada'}</h2>
          {linked?.name ? <p className={styles.copy}>{linked.name}</p> : null}
        </div>
        {linked ? (
          <span className={`${styles.status} ${canPlay ? '' : styles.statusOff}`}>
            <span className={styles.dot} aria-hidden="true" />
            {canPlay ? 'Disponível' : 'Indisponível'}
          </span>
        ) : null}
      </div>
      {webcams.webcam.isError ? (
        <p className={styles.error}>
          Não foi possível consultar as câmeras agora. Tente novamente em alguns minutos.
        </p>
      ) : null}
      {webcams.linkError ? <p className={styles.error}>{webcams.linkError}</p> : null}
      {webcams.unlinkError ? <p className={styles.error}>{webcams.unlinkError}</p> : null}
      {linked && !canPlay ? (
        <p className={styles.copy}>A câmera vinculada não está disponível agora.</p>
      ) : null}
      <div className={styles.actions}>
        {canPlay && linked?.player ? (
          <Button type="button" onClick={() => setPlayerOpen(true)} disabled={playerOpen}>
            {playerOpen ? 'Câmera aberta' : 'Ver câmera'}
          </Button>
        ) : null}
        <Button type="button" onClick={startSearch} disabled={webcams.search.isPending}>
          {linked ? 'Trocar câmera' : 'Procurar câmera próxima'}
        </Button>
        {linked ? (
          <Button type="button" variant="quiet" onClick={() => setConfirmRemove(true)}>
            Remover
          </Button>
        ) : null}
      </div>
      {playerOpen && linked?.player ? (
        <WebcamPlayer title={linked.name ?? 'Câmera ao vivo'} embedUrl={linked.player.embedUrl} />
      ) : null}
      {searching ? (
        <WebcamSearch
          items={webcams.search.data}
          busy={webcams.search.isPending}
          selectingId={webcams.link.isPending ? webcams.link.variables?.externalId : null}
          error={webcams.searchError}
          onSelect={(item) => {
            webcams.link.mutate(
              { provider: item.provider, externalId: item.externalId },
              { onSuccess: () => setSearching(false) },
            );
          }}
        />
      ) : null}
      {confirmRemove ? (
        <ConfirmDrawer
          title="Remover câmera?"
          description="O local fica sem transmissão ao vivo até você vincular outra câmera."
          confirmLabel="Remover"
          busy={webcams.unlink.isPending}
          onCancel={() => setConfirmRemove(false)}
          onConfirm={() => {
            webcams.unlink.mutate(undefined, { onSuccess: () => setConfirmRemove(false) });
          }}
        />
      ) : null}
    </Card>
  );
}
