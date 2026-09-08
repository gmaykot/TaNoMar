import { Video } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { webcamSearchCaption } from '../mappers/webcamMapper';
import type { WebcamSearchItem } from '../types/webcam';
import styles from './webcam.module.css';

interface WebcamSearchProps {
  items: WebcamSearchItem[] | undefined;
  busy?: boolean;
  selectingId?: string | null;
  error?: string | null;
  heading?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  busyTitle?: string;
  busyDescription?: string;
  onSelect: (item: WebcamSearchItem) => void;
}

export function WebcamSearch({
  items,
  busy,
  selectingId,
  error,
  heading = 'Câmeras encontradas',
  emptyTitle = 'Nenhuma câmera ao vivo encontrada próxima deste local.',
  emptyDescription = 'Tente outro ponto ou volte mais tarde.',
  busyTitle = 'Buscando câmeras próximas...',
  busyDescription = 'Consultando transmissões utilizáveis perto deste local.',
  onSelect,
}: WebcamSearchProps) {
  if (busy) {
    return <FeedbackState title={busyTitle} description={busyDescription} icon={Video} busy />;
  }
  if (error) return <p className={styles.error}>{error}</p>;
  if (!items) return null;
  if (items.length === 0) {
    return <FeedbackState title={emptyTitle} description={emptyDescription} icon={Video} />;
  }

  return (
    <div className={styles.results}>
      <h3>{heading}</h3>
      {items.map((item) => (
        <article key={`${item.provider}:${item.externalId}`} className={styles.result}>
          <div className={styles.resultCopy}>
            {item.previewUrl ? (
              <img className={styles.preview} src={item.previewUrl} alt="" />
            ) : null}
            <strong>
              <Video size={16} aria-hidden="true" /> {item.name}
            </strong>
            <span className={styles.copy}>{webcamSearchCaption(item)}</span>
            <span className={styles.status}>
              <span className={styles.dot} aria-hidden="true" />
              {item.isLive ? 'Ao vivo' : 'Sem transmissão ao vivo'}
            </span>
          </div>
          <Button type="button" onClick={() => onSelect(item)} disabled={Boolean(selectingId)}>
            {selectingId === item.externalId ? 'Selecionando...' : 'Selecionar'}
          </Button>
        </article>
      ))}
    </div>
  );
}
