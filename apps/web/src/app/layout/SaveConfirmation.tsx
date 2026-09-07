import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { subscribeToSaveConfirmation } from './saveConfirmationEvents';
import styles from './SaveConfirmation.module.css';

export function SaveConfirmation() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timeout: number | undefined;
    const unsubscribe = subscribeToSaveConfirmation((nextMessage) => {
      window.clearTimeout(timeout);
      setMessage(nextMessage);
      timeout = window.setTimeout(() => setMessage(null), 3500);
    });
    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  return message ? (
    <div className={styles.confirmation} role="status">
      <CheckCircle2 size={18} aria-hidden="true" /> {message}
    </div>
  ) : null;
}
