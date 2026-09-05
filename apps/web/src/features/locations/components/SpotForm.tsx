import { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import type { FishingLocation } from '@/features/fishing/types/fishing';
import { islandWideRegion, resolveRegion } from '../regions';
import type { PersonalSpotInput } from '../services/locationsService';
import { RegionPicker } from './RegionPicker';
import styles from './spotForm.module.css';

const profiles: Array<{ value: FishingLocation['profile']; label: string }> = [
  { value: 'praia_aberta', label: 'Praia aberta' },
  { value: 'praia_semi_aberta', label: 'Praia semiaberta' },
  { value: 'praia_protegida', label: 'Águas protegidas' },
];

interface SpotFormProps {
  initial?: FishingLocation;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: (input: PersonalSpotInput) => void;
  onDelete?: () => void;
}

export function SpotForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onDelete,
}: SpotFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [city, setCity] = useState(initial?.city ?? 'Florianópolis');
  const [region, setRegion] = useState(resolveRegion(initial?.region ?? islandWideRegion));
  const [latitude, setLatitude] = useState(String(initial?.latitude ?? ''));
  const [longitude, setLongitude] = useState(String(initial?.longitude ?? ''));
  const [orientation, setOrientation] = useState(String(initial?.seaOrientationDegrees ?? '90'));
  const [profile, setProfile] = useState<FishingLocation['profile']>(
    initial?.profile ?? 'praia_aberta',
  );
  const [shared, setShared] = useState(initial?.visibility === 'shared');
  const [geoError, setGeoError] = useState<string | null>(null);

  function useGps() {
    if (!navigator.geolocation) {
      setGeoError('Seu navegador não informa a localização.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(5));
        setLongitude(position.coords.longitude.toFixed(5));
        setGeoError(null);
      },
      () => setGeoError('Não foi possível ler o GPS. Preencha as coordenadas.'),
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        const lat = Number(latitude);
        const lon = Number(longitude);
        const seaOrientationDegrees = Number(orientation);
        if (!name.trim() || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
        onSubmit({
          name: name.trim(),
          description: description.trim() || undefined,
          city: city.trim(),
          state: initial?.state ?? 'SC',
          region: resolveRegion(region),
          latitude: lat,
          longitude: lon,
          seaOrientationDegrees: Number.isFinite(seaOrientationDegrees) ? seaOrientationDegrees : 0,
          profile,
          shared,
        });
      }}
    >
      <label className={styles.field}>
        <span>Nome do pesqueiro</span>
        <input value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <label className={styles.field}>
        <span>Descrição</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Cidade</span>
        <input value={city} onChange={(event) => setCity(event.target.value)} />
      </label>
      <RegionPicker
        value={region}
        hint="Toque no pedaço da ilha onde fica o pesqueiro."
        onChange={setRegion}
      />
      <div className={styles.row}>
        <label className={styles.field}>
          <span>Latitude</span>
          <input
            inputMode="decimal"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            required
          />
        </label>
        <label className={styles.field}>
          <span>Longitude</span>
          <input
            inputMode="decimal"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            required
          />
        </label>
      </div>
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={useGps}>
          Usar minha localização
        </Button>
      </div>
      {geoError ? <p className={styles.error}>{geoError}</p> : null}
      <div className={styles.row}>
        <label className={styles.field}>
          <span>Orientação do mar (graus)</span>
          <input
            inputMode="numeric"
            value={orientation}
            onChange={(event) => setOrientation(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Perfil costeiro</span>
          <select
            value={profile}
            onChange={(event) => setProfile(event.target.value as FishingLocation['profile'])}
          >
            {profiles.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={styles.choice}>
        <input
          type="checkbox"
          checked={shared}
          onChange={(event) => setShared(event.target.checked)}
        />
        <span>
          Compartilhar com a comunidade
          <small>O local fica privado até um admin aprovar a publicação.</small>
        </span>
      </label>
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.actions}>
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
        {onDelete ? (
          <Button type="button" variant="quiet" onClick={onDelete} disabled={pending}>
            Excluir
          </Button>
        ) : null}
      </div>
    </form>
  );
}
