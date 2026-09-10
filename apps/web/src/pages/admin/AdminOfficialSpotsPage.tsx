import { ArrowLeft, MapPinned, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { SearchField } from '@/design-system/components/SearchField';
import type { AdminOfficialLocation } from '@/features/fishing/types/fishing';
import {
  adminOfficialSpotsQueryKey,
  useAdminOfficialSpots,
} from '@/features/locations/hooks/useAdminOfficialSpots';
import { locationsQueryKey } from '@/features/locations/hooks/useLocationMutations';
import { extraRegions, islandRegions, regionLabel } from '@/features/locations/regions';
import {
  officialLocationToInput,
  deleteAdminOfficialLocation,
  updateAdminOfficialLocation,
} from '@/features/locations/services/locationsService';
import { fishingEnvironments, spotTypeLabel, spotTypes } from '@/features/locations/spotCatalog';
import formStyles from '@/features/locations/components/spotForm.module.css';
import { PageHeader } from '@/pages/shared/PageHeader';
import { ApiError } from '@/shared/api/errors';
import { routes } from '@/shared/constants/routes';
import { normalizeText } from '@/shared/utils/normalizeText';
import adminStyles from './admin.module.css';
import styles from '@/pages/shared/pages.module.css';

const regionFilters = [...islandRegions, ...extraRegions];

export function AdminOfficialSpotsPage() {
  const spots = useAdminOfficialSpots();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [type, setType] = useState('');
  const [environment, setEnvironment] = useState('');
  const [status, setStatus] = useState('');
  const [free, setFree] = useState('');
  const [camera, setCamera] = useState('');

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminOfficialSpotsQueryKey }),
      queryClient.invalidateQueries({ queryKey: locationsQueryKey }),
      queryClient.invalidateQueries({ queryKey: ['forecast'] }),
      queryClient.invalidateQueries({ queryKey: ['location-forecast'] }),
    ]);
  };

  const updateFlags = useMutation({
    mutationFn: ({
      location,
      patch,
    }: {
      location: AdminOfficialLocation;
      patch: Partial<Pick<AdminOfficialLocation, 'isActive' | 'isFreeDefault'>>;
    }) =>
      updateAdminOfficialLocation(location.id, { ...officialLocationToInput(location), ...patch }),
    onSuccess: async () => {
      await refresh();
      setError(null);
      showSaveConfirmation('Local do sistema atualizado.');
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : 'Não foi possível atualizar o local.');
    },
  });
  const remove = useMutation({
    mutationFn: deleteAdminOfficialLocation,
    onSuccess: async () => {
      await refresh();
      setError(null);
      showSaveConfirmation('Local do sistema removido.');
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : 'Não foi possível remover o local.');
    },
  });

  const items = useMemo(() => {
    const term = normalizeText(search.trim());
    return (spots.data ?? []).filter((location) => {
      if (region && location.region !== region) return false;
      if (type && location.type !== type) return false;
      if (environment && location.fishingEnvironment !== environment) return false;
      if (status === 'on' && !location.isActive) return false;
      if (status === 'off' && location.isActive) return false;
      if (free === 'on' && !location.isFreeDefault) return false;
      if (free === 'off' && location.isFreeDefault) return false;
      if (camera === 'on' && !location.hasLiveWebcam) return false;
      if (camera === 'off' && location.hasLiveWebcam) return false;
      if (!term) return true;
      return normalizeText(`${location.name} ${location.city}`).includes(term);
    });
  }, [camera, environment, free, region, search, spots.data, status, type]);

  if (spots.isPending) {
    return (
      <FeedbackState
        title="Locais do sistema"
        description="Carregando os pontos oficiais do mapa."
        icon={MapPinned}
        busy
      />
    );
  }
  if (spots.isError) {
    return (
      <FeedbackState
        title="Locais indisponíveis"
        description="Não foi possível carregar os locais do sistema."
      />
    );
  }

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.admin}>
        <ArrowLeft size={16} aria-hidden="true" />
        Administração
      </Link>
      <PageHeader
        eyebrow="Administração"
        title="Locais do sistema."
        description="Cadastre, habilite e marque quais entram no plano Free. A câmera ao vivo também fica neste cadastro."
      />
      <div className={styles.pageHeaderActions}>
        <Link className={styles.backLink} to={routes.adminOfficialSpotNew}>
          <Plus size={16} aria-hidden="true" /> Novo local
        </Link>
      </div>
      <div className={adminStyles.filters}>
        <SearchField
          label="Pesquisar locais"
          value={search}
          placeholder="Pesquisar por nome"
          onChange={setSearch}
        />
        <label className={adminStyles.filter}>
          <span>Região</span>
          <select value={region} onChange={(event) => setRegion(event.target.value)}>
            <option value="">Todas</option>
            {regionFilters.map((item) => (
              <option key={item.id} value={item.value}>
                {item.shortLabel}
              </option>
            ))}
          </select>
        </label>
        <label className={adminStyles.filter}>
          <span>Tipo</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Todos</option>
            {spotTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className={adminStyles.filter}>
          <span>Ambiente</span>
          <select value={environment} onChange={(event) => setEnvironment(event.target.value)}>
            <option value="">Todos</option>
            {fishingEnvironments.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className={adminStyles.filter}>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos</option>
            <option value="on">Habilitado</option>
            <option value="off">Desabilitado</option>
          </select>
        </label>
        <label className={adminStyles.filter}>
          <span>Free</span>
          <select value={free} onChange={(event) => setFree(event.target.value)}>
            <option value="">Todos</option>
            <option value="on">Padrão Free</option>
            <option value="off">Pago</option>
          </select>
        </label>
        <label className={adminStyles.filter}>
          <span>Câmera</span>
          <select value={camera} onChange={(event) => setCamera(event.target.value)}>
            <option value="">Todas</option>
            <option value="on">Com câmera</option>
            <option value="off">Sem câmera</option>
          </select>
        </label>
      </div>
      {error ? <p className={formStyles.error}>{error}</p> : null}
      {items.length === 0 ? (
        <FeedbackState
          title={spots.data?.length ? 'Nenhum local encontrado' : 'Nenhum local do sistema'}
          description={
            spots.data?.length
              ? 'Ajuste a busca ou os filtros para ver os locais do sistema.'
              : 'Cadastre o primeiro ponto oficial para o mapa TáNoMar.'
          }
          icon={MapPinned}
        />
      ) : (
        <div className={styles.locationGrid}>
          {items.map((location) => (
            <Card as="article" key={location.id} className={adminStyles.adminCard}>
              <div>
                <strong>{location.name}</strong>
                <p className={adminStyles.adminMeta}>
                  <span>{regionLabel(location.region)}</span>
                  <span>{spotTypeLabel(location.type)}</span>
                  <span>{location.isActive ? 'Habilitado' : 'Desabilitado'}</span>
                  <span>{location.isFreeDefault ? 'Free' : 'Pago'}</span>
                  <span>{location.hasLiveWebcam ? 'Câmera' : 'Sem câmera'}</span>
                </p>
              </div>
              <label className={formStyles.choice}>
                <input
                  type="checkbox"
                  checked={location.isActive}
                  disabled={updateFlags.isPending}
                  onChange={(event) =>
                    updateFlags.mutate({
                      location,
                      patch: { isActive: event.target.checked },
                    })
                  }
                />
                <span>Habilitado</span>
              </label>
              <label className={formStyles.choice}>
                <input
                  type="checkbox"
                  checked={location.isFreeDefault}
                  disabled={updateFlags.isPending}
                  onChange={(event) =>
                    updateFlags.mutate({
                      location,
                      patch: { isFreeDefault: event.target.checked },
                    })
                  }
                />
                <span>Aparece no plano Free</span>
              </label>
              <div className={adminStyles.adminActions}>
                <Link className={styles.backLink} to={routes.adminOfficialSpotEdit(location.id)}>
                  Editar
                </Link>
                {location.isActive ? (
                  <Link className={styles.backLink} to={routes.locationDetails(location.id)}>
                    Ver no mapa
                  </Link>
                ) : null}
                <Button
                  type="button"
                  variant="quiet"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Excluir ${location.name}?`)) remove.mutate(location.id);
                  }}
                >
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
