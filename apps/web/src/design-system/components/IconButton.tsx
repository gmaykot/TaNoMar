import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './components.module.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({ label, children, className = '', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`${styles.iconButton} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
