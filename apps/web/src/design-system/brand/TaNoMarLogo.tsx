import styles from './brand.module.css';

type LogoVariant = 'horizontal' | 'compact' | 'responsive' | 'symbol';

interface TaNoMarLogoProps {
  variant?: LogoVariant;
}

const assets = {
  horizontal: '/brand/tanomar-logo-horizontal.png',
  compact: '/brand/tanomar-logo-horizontal-compact.png',
  symbol: '/brand/tanomar-symbol.png',
} as const;

const classNames = {
  horizontal: styles.horizontal,
  compact: styles.compact,
  symbol: styles.symbol,
} as const;

export function TaNoMarLogo({ variant = 'horizontal' }: TaNoMarLogoProps) {
  const alt = 'TáNoMar — Pesque no momento certo';

  if (variant === 'responsive') {
    return (
      <span className={styles.logo}>
        <img className={styles.compactOnly} src={assets.compact} alt="" />
        <img className={styles.horizontalOnly} src={assets.horizontal} alt="" />
      </span>
    );
  }

  return <img className={classNames[variant]} src={assets[variant]} alt={alt} />;
}
