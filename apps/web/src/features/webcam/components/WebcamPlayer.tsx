import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from '@/design-system/components/IconButton';
import { webcamAutoplayUrl } from '../mappers/webcamMapper';
import styles from './webcam.module.css';

interface WebcamPlayerProps {
  title: string;
  embedUrl: string;
  expanded?: boolean;
  onClose?: () => void;
}

async function allowDeviceRotation() {
  try {
    if (document.fullscreenEnabled && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // iOS e alguns navegadores bloqueiam fullscreen no documento.
  }
  try {
    screen.orientation?.unlock();
  } catch {
    // Sem Screen Orientation API.
  }
}

async function leaveExpandedPlayback() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    // Sem permissão para sair do fullscreen.
  }
}

export function WebcamPlayer({ title, embedUrl, expanded = false, onClose }: WebcamPlayerProps) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.dataset.webcamExpanded = '';
    void allowDeviceRotation();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current?.();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      delete document.body.dataset.webcamExpanded;
      document.removeEventListener('keydown', onKeyDown);
      void leaveExpandedPlayback();
    };
  }, [expanded]);

  const frame = (
    <iframe
      title={`Câmera ao vivo: ${title}`}
      src={webcamAutoplayUrl(embedUrl)}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      loading={expanded ? 'eager' : 'lazy'}
    />
  );

  if (!expanded) {
    return <div className={styles.player}>{frame}</div>;
  }

  return createPortal(
    <div
      className={styles.expanded}
      role="dialog"
      aria-modal="true"
      aria-label={`Câmera ao vivo: ${title}`}
    >
      <div className={styles.expandedBar}>
        <p>Vire o celular para a transmissão preencher a tela</p>
        {onClose ? (
          <IconButton label="Fechar câmera" onClick={onClose} className={styles.expandedClose}>
            <X size={20} aria-hidden="true" />
          </IconButton>
        ) : null}
      </div>
      <div className={styles.expandedStage}>{frame}</div>
    </div>,
    document.body,
  );
}
