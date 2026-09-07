const saveConfirmationEvent = 'tanomar:save-confirmation';

export function showSaveConfirmation(message: string) {
  window.dispatchEvent(new CustomEvent(saveConfirmationEvent, { detail: message }));
}

export function subscribeToSaveConfirmation(listener: (message: string) => void) {
  const handleConfirmation = (event: Event) => {
    listener((event as CustomEvent<string>).detail);
  };
  window.addEventListener(saveConfirmationEvent, handleConfirmation);
  return () => window.removeEventListener(saveConfirmationEvent, handleConfirmation);
}
