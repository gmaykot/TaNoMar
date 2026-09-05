import type { ButtonHTMLAttributes } from 'react';
import styles from './components.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet';
  locked?: boolean;
}

export function Button({
  className = '',
  variant = 'primary',
  locked = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`${styles.button} ${styles[variant]} ${locked ? styles.buttonLocked : ''} ${className}`}
      disabled={disabled || locked}
    />
  );
}
