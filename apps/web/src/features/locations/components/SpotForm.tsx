import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/design-system/components/Button';
import type { FishingLocation } from '@/features/fishing/types/fishing';
import { routes } from '@/shared/constants/routes';
import { islandWideRegion, resolveRegion } from '../regions';
import type { PersonalSpotInput } from '../services/locationsService';
import { findSimilarLocation } from '../spotProximity';
import type { PlaceSuggestion } from '../types/place';
import { PlaceAutocomplete } from './PlaceAutocomplete';
import { RegionPicker } from './RegionPicker';
import styles from './spotForm.module.css';

const profiles: Array<{ value: FishingLocation['profile']; label: string }> = [
  { value: 'praia_aberta', label: 'Praia aberta' },
  { value: 'praia_semi_aberta', label: 'Praia semiaberta' },
  { value: 'praia_protegida', label: 'Águas protegidas' },
];

interface SpotFormProps {
  initial?: FishingLocation;
  existing?: FishingLocation[];
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: (input: PersonalSpotInput) => void;
  onDelete?: () => void;
}

export function SpotForm({
  initial,
  existing = [],
  submitLabel,
  pending,
  error,
  onSubmit,
  onDelete,
}: SpotFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [placeQuery, setPlaceQuery] = useState(initial?.city ?? 'Florianópolis');
  const [city, setCity] = useState(initial?.city ?? 'Florianópolis');
  const [state, setState] = useState(initial?.state ?? 'SC');
  const [region, setRegion] = useState(resolveRegion(initial?.region ?? islandWideRegion));
  const [latitude, setLatitude] = useState(String(initial?.latitude ?? ''));
  const [longitude, setLongitude] = useState(String(initial?.longitude ?? ''));
  const [orientation, setOrientation] = useState(String(initial?.seaOrientationDegrees ?? '90'));
  const [profile, setProfile] = useState<FishingLocation['profile']>(
    initial?.profile ?? 'praia_aberta',
  );
  const [shared, setShared] = useState(initial?.visibility === 'shared');
  const [geoError, setGeoError] = useState<string | null>(null);
  const latitudeValue = Number(latitude);
  const longitudeValue = Number(longitude);
  const similar = findSimilarLocation(existing, {
    name,
    latitude: Number.isFinite(latitudeValue) ? latitudeValue : null,
    longitude: Number.isFinite(longitudeValue) ? longitudeValue : null,
    excludeId: initial?.id,
  });

  function similarMessage(match: NonNullable<typeof similar>) {
    if (match.reason === 'proximity') {
      const meters = match.meters === null ? '' : ` (${Math.round(match.meters)} m)`;
      return `Já existe um local muito próximo${meters}:`;
    }
    return 'Já existe um local com esse nome:';
  }

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
        if (
          findSimilarLocation(existing, {
            name: name.trim(),
            latitude: lat,
            longitude: lon,
            excludeId: initial?.id,
          })
        ) {
          return;
        }
        onSubmit({
          name: name.trim(),
          description: description.trim() || undefined,
          city: city.trim(),
          state,
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
        <span>Nome do local</span>
        <input value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <label className={styles.field}>
        <span>Descrição</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <PlaceAutocomplete
        value={placeQuery}
        isRegistered={(place) =>
          Boolean(
            findSimilarLocation(existing, {
              name: place.name,
              latitude: place.latitude,
              longitude: place.longitude,
              excludeId: initial?.id,
            }),
          )
        }
        onChange={(value) => {
          setPlaceQuery(value);
          setCity(value);
        }}
        onSelect={(place: PlaceSuggestion) => {
          setPlaceQuery(place.formatted);
          setCity(place.city);
          setState(place.state);
          setLatitude(place.latitude.toFixed(5));
          setLongitude(place.longitude.toFixed(5));
          setGeoError(null);
          if (!name.trim()) setName(place.name);
        }}
      />
      <RegionPicker
        value={region}
        hint="Toque no pedaço da ilha onde fica o local."
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
      {similar ? (
        <p className={styles.duplicate} role="alert">
          {similarMessage(similar)}{' '}
          <Link to={routes.locationDetails(similar.location.id)}>{similar.location.name}</Link>
        </p>
      ) : null}
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
        <Button type="submit" disabled={pending || Boolean(similar)}>
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
