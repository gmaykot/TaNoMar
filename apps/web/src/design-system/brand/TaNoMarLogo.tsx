import styles from './brand.module.css';

type LogoVariant = 'horizontal' | 'compact' | 'responsive' | 'symbol';
type LogoTone = 'onLight' | 'onDark';

interface TaNoMarLogoProps {
  variant?: LogoVariant;
  tone?: LogoTone;
  decorative?: boolean;
}

const assets = {
  onLight: {
    horizontal: {
      src: '/brand/logos/tanomar-horizontal-slogan-1200.png',
      srcSet:
        '/brand/logos/tanomar-horizontal-slogan-600.png 600w, /brand/logos/tanomar-horizontal-slogan-1200.png 1200w, /brand/logos/tanomar-horizontal-slogan-2000.png 2000w',
    },
    compact: {
      src: '/brand/logos/tanomar-horizontal-sem-slogan-600.png',
      srcSet:
        '/brand/logos/tanomar-horizontal-sem-slogan-300.png 300w, /brand/logos/tanomar-horizontal-sem-slogan-600.png 600w, /brand/logos/tanomar-horizontal-sem-slogan-1200.png 1200w',
    },
    symbol: {
      src: '/brand/simbolos/tanomar-simbolo-256.png',
      srcSet:
        '/brand/simbolos/tanomar-simbolo-128.png 128w, /brand/simbolos/tanomar-simbolo-256.png 256w, /brand/simbolos/tanomar-simbolo-512.png 512w',
    },
  },
  onDark: {
    horizontal: {
      src: '/brand/logos/tanomar-horizontal-branca-1200.png',
      srcSet:
        '/brand/logos/tanomar-horizontal-branca-600.png 600w, /brand/logos/tanomar-horizontal-branca-1200.png 1200w, /brand/logos/tanomar-horizontal-branca-2000.png 2000w',
    },
    compact: {
      src: '/brand/logos/tanomar-horizontal-branca-600.png',
      srcSet:
        '/brand/logos/tanomar-horizontal-branca-600.png 600w, /brand/logos/tanomar-horizontal-branca-1200.png 1200w',
    },
    symbol: {
      src: '/brand/simbolos/tanomar-simbolo-fundo-escuro-256.png',
      srcSet:
        '/brand/simbolos/tanomar-simbolo-fundo-escuro-128.png 128w, /brand/simbolos/tanomar-simbolo-fundo-escuro-256.png 256w, /brand/simbolos/tanomar-simbolo-fundo-escuro-512.png 512w',
    },
  },
} as const;

const classNames = {
  horizontal: styles.horizontal,
  compact: styles.compact,
  symbol: styles.symbol,
} as const;

export function TaNoMarLogo({
  variant = 'horizontal',
  tone = 'onLight',
  decorative = false,
}: TaNoMarLogoProps) {
  const alt = decorative ? '' : 'TáNoMar';
  const pack = assets[tone];

  if (variant === 'responsive') {
    return (
      <span className={styles.logo}>
        <img
          className={styles.compactOnly}
          src={pack.compact.src}
          srcSet={pack.compact.srcSet}
          sizes="11rem"
          alt=""
        />
        <img
          className={styles.horizontalOnly}
          src={pack.horizontal.src}
          srcSet={pack.horizontal.srcSet}
          sizes="16rem"
          alt=""
        />
      </span>
    );
  }

  const asset = pack[variant];
  return (
    <img
      className={classNames[variant]}
      src={asset.src}
      srcSet={asset.srcSet}
      sizes={variant === 'symbol' ? '2.75rem' : variant === 'compact' ? '11rem' : '16rem'}
      alt={alt}
    />
  );
}
