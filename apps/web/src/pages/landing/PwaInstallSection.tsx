import { Download, Laptop, Share, Smartphone, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { usePwaLifecycle } from '@/app/hooks/usePwaLifecycle';
import { detectInstallPlatform, type InstallPlatform } from './installPlatforms';
import styles from './landing.module.css';

const instructions: Record<
  InstallPlatform,
  { label: string; icon: typeof Smartphone; steps: string[] }
> = {
  android: {
    label: 'Android · Chrome',
    icon: Smartphone,
    steps: [
      'Acesse o TáNoMar pelo Chrome.',
      'Abra o menu do navegador.',
      'Toque em “Instalar app” ou “Adicionar à tela inicial”.',
      'Confirme a instalação.',
    ],
  },
  ios: {
    label: 'iPhone/iPad · Safari',
    icon: Share,
    steps: [
      'Acesse o TáNoMar pelo Safari.',
      'Toque no botão de compartilhar.',
      'Selecione “Adicionar à Tela de Início”.',
      'Confirme em “Adicionar”.',
    ],
  },
  desktop: {
    label: 'Computador · Chrome ou Edge',
    icon: Laptop,
    steps: [
      'Acesse o TáNoMar pelo navegador.',
      'Clique no ícone de instalação disponível na barra de endereço.',
      'Confirme a instalação.',
    ],
  },
};

export function PwaInstallSection() {
  const pwa = usePwaLifecycle();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [platform, setPlatform] = useState<InstallPlatform>(() =>
    detectInstallPlatform(navigator.userAgent),
  );

  function openInstructions() {
    if (typeof dialogRef.current?.showModal === 'function') dialogRef.current.showModal();
    else dialogRef.current?.setAttribute('open', '');
  }

  function closeInstructions() {
    if (typeof dialogRef.current?.close === 'function') dialogRef.current.close();
    else dialogRef.current?.removeAttribute('open');
  }

  return (
    <section
      className={`${styles.section} ${styles.installSection}`}
      id="instalar"
      aria-labelledby="install-title"
    >
      <div className={styles.installCopy}>
        <span>Aplicativo sem loja</span>
        <h2 id="install-title">Leve o TáNoMar com você.</h2>
        <p>
          O TáNoMar pode ser instalado diretamente pelo navegador e usado como um aplicativo, sem
          depender de uma loja.
        </p>
        <ul>
          <li>Funciona no celular, tablet e computador.</li>
          <li>Pode ganhar um ícone na tela inicial.</li>
          <li>Abre em uma janela semelhante a um aplicativo.</li>
          <li>Recebe atualizações pela web.</li>
        </ul>
        <div className={styles.installActions}>
          {pwa.canInstall ? (
            <button className={styles.primaryCta} type="button" onClick={() => void pwa.install()}>
              <Download size={18} aria-hidden="true" /> Instalar agora
            </button>
          ) : null}
          <button className={styles.secondaryCta} type="button" onClick={openInstructions}>
            Como instalar o TáNoMar
          </button>
        </div>
      </div>
      <div className={styles.installVisual} aria-hidden="true">
        <div className={styles.installIcon}>
          <img src="/icons/icon-192.png" alt="" loading="lazy" />
        </div>
        <span>TáNoMar</span>
        <small>Na sua tela inicial</small>
      </div>
      <dialog
        className={styles.installDialog}
        ref={dialogRef}
        aria-labelledby="install-dialog-title"
      >
        <div className={styles.dialogHeader}>
          <div>
            <span>Passo a passo</span>
            <h2 id="install-dialog-title">Instale no seu dispositivo</h2>
          </div>
          <button type="button" onClick={closeInstructions} aria-label="Fechar instruções">
            <X aria-hidden="true" />
          </button>
        </div>
        <div className={styles.installTabs} role="tablist" aria-label="Escolha o dispositivo">
          {(Object.keys(instructions) as InstallPlatform[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={platform === key}
              aria-controls="install-instructions-panel"
              onClick={() => setPlatform(key)}
            >
              {instructions[key].label}
            </button>
          ))}
        </div>
        <div className={styles.instructionPanel} id="install-instructions-panel" role="tabpanel">
          {(() => {
            const Icon = instructions[platform].icon;
            return <Icon size={24} aria-hidden="true" />;
          })()}
          <h3>{instructions[platform].label}</h3>
          <ol>
            {instructions[platform].steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </dialog>
    </section>
  );
}
