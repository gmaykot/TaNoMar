import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/design-system/components/Button';
import type { FishingLocation } from '@/features/fishing/types/fishing';
import { routes } from '@/shared/constants/routes';
import { resolveSpotRegion } from '../regions';
import type { SpotFormValues } from '../services/locationsService';
import {
  accessTypes,
  coastalProfiles,
  fishingEnvironments,
  spotTypes,
  type AccessType,
  type CoastalProfile,
  type FishingEnvironment,
  type SpotType,
} from '../spotCatalog';
import { findSimilarLocation } from '../spotProximity';
import type { PlaceSuggestion } from '../types/place';
import { PlaceAutocomplete } from './PlaceAutocomplete';
import { RegionPicker } from './RegionPicker';
import styles from './spotForm.module.css';

interface SpotFormProps {
  initial?: FishingLocation;
  existing?: FishingLocation[];
  submitLabel: string;
  pending: boolean;
  error: string | null;
  variant?: 'personal' | 'official';
  isActive?: boolean;
  isFreeDefault?: boolean;
  onSubmit: (input: SpotFormValues) => void;
  onDelete?: () => void;
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function SpotForm({
  initial,
  existing = [],
  submitLabel,
  pending,
  error,
  variant = 'personal',
  isActive: initialActive = true,
  isFreeDefault: initialFreeDefault = false,
  onSubmit,
  onDelete,
}: SpotFormProps) {
  const official = variant === 'official';
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [type, setType] = useState<SpotType>(
    spotTypes.some((item) => item.value === initial?.type) ? (initial?.type as SpotType) : 'praia',
  );
  const [placeQuery, setPlaceQuery] = useState(initial?.city ?? 'Florianópolis');
  const [city, setCity] = useState(initial?.city ?? 'Florianópolis');
  const [state, setState] = useState(initial?.state ?? 'SC');
  const [region, setRegion] = useState(resolveSpotRegion(initial?.region ?? ''));
  const [latitude, setLatitude] = useState(
    initial?.latitude == null ? '' : String(initial.latitude),
  );
  const [longitude, setLongitude] = useState(
    initial?.longitude == null ? '' : String(initial.longitude),
  );
  const [orientation, setOrientation] = useState(
    initial?.seaOrientationDegrees == null ? '' : String(initial.seaOrientationDegrees),
  );
  const [profile, setProfile] = useState<CoastalProfile>(initial?.profile ?? 'praia_aberta');
  const [environment, setEnvironment] = useState<FishingEnvironment>(
    fishingEnvironments.some((item) => item.value === initial?.fishingEnvironment)
      ? (initial?.fishingEnvironment as FishingEnvironment)
      : 'mar_aberto',
  );
  const [accessType, setAccessType] = useState<AccessType>(
    accessTypes.some((item) => item.value === initial?.accessType)
      ? (initial?.accessType as AccessType)
      : 'terrestre',
  );
  const [restrictionNotes, setRestrictionNotes] = useState(initial?.restrictionNotes ?? '');
  const [shared, setShared] = useState(initial?.visibility === 'shared');
  const [isActive, setIsActive] = useState(initialActive);
  const [isFreeDefault, setIsFreeDefault] = useState(initialFreeDefault);
  const [geoError, setGeoError] = useState<string | null>(null);
  const latitudeValue = parseOptionalNumber(latitude);
  const longitudeValue = parseOptionalNumber(longitude);
  const similar = findSimilarLocation(existing, {
    name,
    latitude: latitudeValue,
    longitude: longitudeValue,
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

  function submitForm() {
    const lat = parseOptionalNumber(latitude);
    const lon = parseOptionalNumber(longitude);
    const seaOrientationDegrees = parseOptionalNumber(orientation);
    if (!name.trim() || !region) return;
    if (!official && (lat === null || lon === null)) return;
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
      region,
      latitude: lat,
      longitude: lon,
      seaOrientationDegrees,
      profile,
      type,
      fishingEnvironment: environment,
      accessType,
      restrictionNotes: restrictionNotes.trim() || undefined,
      shared: official ? false : shared,
      isActive,
      isFreeDefault,
    });
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        submitForm();
      }}
    >
      <fieldset className={styles.group}>
        <legend>Identificação</legend>
        <label className={styles.field}>
          <span>Nome do local</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className={styles.field}>
          <span>Descrição</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        {official ? (
          <label className={styles.field}>
            <span>Tipo</span>
            <select value={type} onChange={(event) => setType(event.target.value as SpotType)}>
              {spotTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <RegionPicker
          mode="spot"
          value={region}
          hint="Toque na região geográfica principal do local."
          onChange={setRegion}
        />
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Localização</legend>
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
          onChange={setPlaceQuery}
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
        <div className={styles.row}>
          <label className={styles.field}>
            <span>Cidade</span>
            <input value={city} onChange={(event) => setCity(event.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Estado</span>
            <input
              value={state}
              maxLength={2}
              onChange={(event) => setState(event.target.value.toUpperCase())}
            />
          </label>
        </div>
        <div className={styles.row}>
          <label className={styles.field}>
            <span>Latitude</span>
            <input
              inputMode="decimal"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              required={!official}
            />
          </label>
          <label className={styles.field}>
            <span>Longitude</span>
            <input
              inputMode="decimal"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              required={!official}
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
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Características para previsão</legend>
        <p className={styles.groupHint}>
          O perfil descreve a exposição do local. A orientação do mar é o azimute em graus para onde
          o mar está; deixe em branco se não se aplicar.
        </p>
        {official ? (
          <label className={styles.field}>
            <span>Ambiente</span>
            <select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value as FishingEnvironment)}
            >
              {fishingEnvironments.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
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
            <span>Perfil / exposição</span>
            <select
              value={profile}
              onChange={(event) => setProfile(event.target.value as CoastalProfile)}
            >
              {coastalProfiles.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      {official ? (
        <fieldset className={styles.group}>
          <legend>Acesso</legend>
          <label className={styles.field}>
            <span>Tipo de acesso</span>
            <select
              value={accessType}
              onChange={(event) => setAccessType(event.target.value as AccessType)}
            >
              {accessTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Restrições e observações</span>
            <textarea
              value={restrictionNotes}
              onChange={(event) => setRestrictionNotes(event.target.value)}
              placeholder="Pesca proibida, acesso restrito, restrições sazonais…"
            />
          </label>
        </fieldset>
      ) : null}

      {official ? (
        <fieldset className={styles.group}>
          <legend>Disponibilidade</legend>
          <label className={styles.choice}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span>
              Local habilitado
              <small>Desligado, some do mapa, do ranking e das previsões.</small>
            </span>
          </label>
          <label className={styles.choice}>
            <input
              type="checkbox"
              checked={isFreeDefault}
              onChange={(event) => setIsFreeDefault(event.target.checked)}
            />
            <span>
              Aparece no plano Free
              <small>Os demais planos pagos continuam vendo o local habilitado.</small>
            </span>
          </label>
        </fieldset>
      ) : (
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
      )}
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.actions}>
        <Button type="submit" disabled={pending || Boolean(similar) || !region}>
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
