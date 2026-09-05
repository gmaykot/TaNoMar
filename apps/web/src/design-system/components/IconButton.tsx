import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './components.module.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  locked?: boolean;
  children: ReactNode;
}

export function IconButton({
  label,
  locked = false,
  children,
  className = '',
  disabled,
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type="button"
      aria-label={label}
      className={`${styles.iconButton} ${locked ? styles.iconButtonLocked : ''} ${className}`}
      disabled={disabled || locked}
    >
      {children}
    </button>
  );
}
