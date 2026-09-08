import { useState, type FormEvent } from 'react';
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
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [youtubeQuery, setYoutubeQuery] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const linked = webcams.webcam.data?.linked === true ? webcams.webcam.data : null;
  const canPlay = Boolean(linked?.isAvailable && linked.player?.embedUrl);

  function startSearch() {
    if (webcams.search.isPending) return;
    setYoutubeOpen(false);
    setSearching(true);
    webcams.search.mutate();
  }

  function startYouTube() {
    setSearching(false);
    setYoutubeOpen(true);
  }

  function lookupYouTube(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = youtubeQuery.trim();
    if (!query || webcams.youtubeLookup.isPending) return;
    webcams.youtubeLookup.mutate(query);
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
        {admin ? (
          <Button type="button" variant="secondary" onClick={startYouTube}>
            Incluir do YouTube
          </Button>
        ) : null}
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
      {admin && youtubeOpen ? (
        <form className={styles.lookup} onSubmit={lookupYouTube}>
          <label className={styles.lookupField}>
            <span>Link da transmissão no YouTube</span>
            <input
              type="text"
              inputMode="url"
              autoComplete="off"
              placeholder="https://www.youtube.com/watch?v=…"
              value={youtubeQuery}
              onChange={(event) => setYoutubeQuery(event.target.value)}
              required
            />
            <small>
              O TáNoMar confirma se a live está no ar antes de vincular. Sem cadastro de URL.
            </small>
          </label>
          <Button type="submit" disabled={webcams.youtubeLookup.isPending || !youtubeQuery.trim()}>
            {webcams.youtubeLookup.isPending ? 'Verificando...' : 'Verificar'}
          </Button>
          <WebcamSearch
            items={webcams.youtubeLookup.data}
            busy={webcams.youtubeLookup.isPending}
            selectingId={webcams.link.isPending ? webcams.link.variables?.externalId : null}
            error={webcams.youtubeLookupError}
            heading="Transmissão encontrada"
            emptyTitle="Essa transmissão não está ao vivo no YouTube."
            emptyDescription="Cole o link de uma live em andamento."
            busyTitle="Consultando o YouTube..."
            busyDescription="Confirmando se a transmissão está ao vivo."
            onSelect={(item) => {
              webcams.link.mutate(
                { provider: item.provider, externalId: item.externalId },
                {
                  onSuccess: () => {
                    setYoutubeOpen(false);
                    setYoutubeQuery('');
                  },
                },
              );
            }}
          />
        </form>
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
