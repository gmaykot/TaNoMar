import { CircleCheck } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { usePlaceSearch } from '../hooks/usePlaceSearch';
import { minPlaceQueryLength } from '../services/placesService';
import type { PlaceSuggestion } from '../types/place';
import styles from './placeAutocomplete.module.css';

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: PlaceSuggestion) => void;
  isRegistered?: (place: PlaceSuggestion) => boolean;
}

export function PlaceAutocomplete({
  value,
  onChange,
  onSelect,
  isRegistered,
}: PlaceAutocompleteProps) {
  const listId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [allowSearch, setAllowSearch] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { items, isFetching, error } = usePlaceSearch(allowSearch ? value : '');
  const showList = open && allowSearch && value.trim().length >= minPlaceQueryLength;

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function handleChange(next: string) {
    setAllowSearch(true);
    setOpen(true);
    setActiveIndex(-1);
    onChange(next);
  }

  function select(place: PlaceSuggestion) {
    setAllowSearch(false);
    setOpen(false);
    setActiveIndex(-1);
    onSelect(place);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!showList || items.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % items.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? items.length - 1 : index - 1));
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const place = items[activeIndex];
      if (place) select(place);
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <label className={styles.field} htmlFor={inputId}>
        <span>Buscar local</span>
        <input
          id={inputId}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
          autoComplete="off"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => {
            if (allowSearch) setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        <small>Digite e escolha um lugar para preencher cidade e coordenadas.</small>
      </label>
      {showList ? (
        <div className={styles.panel}>
          {isFetching && items.length === 0 ? (
            <p className={styles.status}>Buscando lugares…</p>
          ) : null}
          {error ? <p className={styles.status}>Não foi possível buscar lugares agora.</p> : null}
          {!isFetching && !error && items.length === 0 ? (
            <p className={styles.status}>Nenhum lugar encontrado.</p>
          ) : null}
          {items.length > 0 ? (
            <ul id={listId} role="listbox" className={styles.list}>
              {items.map((place, index) => {
                const registered = Boolean(isRegistered?.(place));
                return (
                  <li key={`${place.latitude},${place.longitude},${place.name}`}>
                    <button
                      type="button"
                      id={`${listId}-option-${index}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      className={
                        registered ? `${styles.option} ${styles.optionRegistered}` : styles.option
                      }
                      data-registered={registered ? 'true' : undefined}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => select(place)}
                    >
                      <span className={styles.optionHead}>
                        <strong>{place.name}</strong>
                        {registered ? (
                          <span className={styles.registeredMark}>
                            <CircleCheck size={14} strokeWidth={2.4} aria-hidden="true" />
                            Já cadastrado
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.optionMeta}>
                        {place.city}
                        {place.state ? `, ${place.state}` : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div id={listId} role="listbox" hidden />
          )}
          <p className={styles.attribution}>
            <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">
              Powered by Geoapify
            </a>
            {' · '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
            >
              © OpenStreetMap contributors
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
}
