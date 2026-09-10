import { ArrowLeft, MapPinned, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import type { AdminOfficialLocation } from '@/features/fishing/types/fishing';
import {
  adminOfficialSpotsQueryKey,
  useAdminOfficialSpots,
} from '@/features/locations/hooks/useAdminOfficialSpots';
import { locationsQueryKey } from '@/features/locations/hooks/useLocationMutations';
import {
  deleteAdminOfficialLocation,
  updateAdminOfficialLocation,
  type OfficialSpotInput,
} from '@/features/locations/services/locationsService';
import formStyles from '@/features/locations/components/spotForm.module.css';
import { PageHeader } from '@/pages/shared/PageHeader';
import { ApiError } from '@/shared/api/errors';
import { routes } from '@/shared/constants/routes';
import adminStyles from './admin.module.css';
import styles from '@/pages/shared/pages.module.css';

function toInput(location: AdminOfficialLocation): OfficialSpotInput {
  return {
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    description: location.description ?? undefined,
    city: location.city,
    state: location.state,
    region: location.region,
    seaOrientationDegrees: location.seaOrientationDegrees,
    profile: location.profile,
    isActive: location.isActive,
    isFreeDefault: location.isFreeDefault,
  };
}

export function AdminOfficialSpotsPage() {
  const spots = useAdminOfficialSpots();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminOfficialSpotsQueryKey }),
      queryClient.invalidateQueries({ queryKey: locationsQueryKey }),
      queryClient.invalidateQueries({ queryKey: ['forecast'] }),
      queryClient.invalidateQueries({ queryKey: ['location-forecast'] }),
    ]);
  };

  const updateFlags = useMutation({
    mutationFn: ({ id, input }: { id: string; input: OfficialSpotInput }) =>
      updateAdminOfficialLocation(id, input),
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

  const items = spots.data ?? [];

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
      {error ? <p className={formStyles.error}>{error}</p> : null}
      {items.length === 0 ? (
        <FeedbackState
          title="Nenhum local do sistema"
          description="Cadastre o primeiro ponto oficial para o mapa TáNoMar."
          icon={MapPinned}
        />
      ) : (
        <div className={styles.locationGrid}>
          {items.map((location) => (
            <Card as="article" key={location.id} className={adminStyles.adminCard}>
              <div>
                <strong>{location.name}</strong>
                <p className={adminStyles.adminMeta}>
                  {location.region}
                  {location.city ? ` · ${location.city}` : ''}
                  {location.isActive ? ' · Habilitado' : ' · Desabilitado'}
                  {location.isFreeDefault ? ' · Plano Free' : ''}
                  {location.hasLiveWebcam ? ' · Câmera' : ''}
                </p>
              </div>
              <label className={formStyles.choice}>
                <input
                  type="checkbox"
                  checked={location.isActive}
                  disabled={updateFlags.isPending}
                  onChange={(event) =>
                    updateFlags.mutate({
                      id: location.id,
                      input: { ...toInput(location), isActive: event.target.checked },
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
                      id: location.id,
                      input: { ...toInput(location), isFreeDefault: event.target.checked },
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
