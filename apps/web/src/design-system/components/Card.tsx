import type { HTMLAttributes } from 'react';
import styles from './components.module.css';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'article' | 'section' | 'div';
  elevated?: boolean;
}

export function Card({ as: Element = 'div', className = '', elevated, ...props }: CardProps) {
  return (
    <Element
      className={`${styles.card} ${elevated ? styles.elevated : ''} ${className}`}
      {...props}
    />
  );
}
