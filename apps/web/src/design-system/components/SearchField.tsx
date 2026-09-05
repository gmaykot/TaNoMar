import { Search, X } from 'lucide-react';
import styles from './components.module.css';

interface SearchFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function SearchField({ label, value, placeholder, onChange }: SearchFieldProps) {
  return (
    <label className={styles.searchField}>
      <span className={styles.srOnly}>{label}</span>
      <Search aria-hidden="true" size={20} />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button type="button" aria-label="Limpar busca" onClick={() => onChange('')}>
          <X aria-hidden="true" size={18} />
        </button>
      )}
    </label>
  );
}
