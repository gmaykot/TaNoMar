import type { ButtonHTMLAttributes } from 'react';
import styles from './components.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet';
}

export function Button({ className = '', variant = 'primary', ...props }: ButtonProps) {
  return <button className={`${styles.button} ${styles[variant]} ${className}`} {...props} />;
}
