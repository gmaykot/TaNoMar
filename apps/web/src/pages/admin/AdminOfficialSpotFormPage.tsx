import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { SpotForm } from '@/features/locations/components/SpotForm';
import {
  adminOfficialSpotsQueryKey,
  useAdminOfficialSpots,
} from '@/features/locations/hooks/useAdminOfficialSpots';
import { locationsQueryKey } from '@/features/locations/hooks/useLocationMutations';
import {
  createAdminOfficialLocation,
  deleteAdminOfficialLocation,
  updateAdminOfficialLocation,
  type OfficialSpotInput,
  type SpotFormValues,
} from '@/features/locations/services/locationsService';
import { WebcamManager } from '@/features/webcam/components/WebcamManager';
import { PageHeader } from '@/pages/shared/PageHeader';
import { ApiError } from '@/shared/api/errors';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

function toOfficialInput(input: SpotFormValues): OfficialSpotInput {
  return {
    name: input.name,
    latitude: input.latitude,
    longitude: input.longitude,
    description: input.description,
    city: input.city,
    state: input.state,
    region: input.region,
    seaOrientationDegrees: input.seaOrientationDegrees,
    profile: input.profile,
    isActive: input.isActive,
    isFreeDefault: input.isFreeDefault,
  };
}

export function AdminOfficialSpotFormPage() {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const list = useAdminOfficialSpots();
  const editing = list.data?.find((item) => item.id === locationId);
  const isNew = !locationId;
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminOfficialSpotsQueryKey }),
      queryClient.invalidateQueries({ queryKey: locationsQueryKey }),
      queryClient.invalidateQueries({ queryKey: ['forecast'] }),
      queryClient.invalidateQueries({ queryKey: ['location-forecast'] }),
      queryClient.invalidateQueries({ queryKey: ['webcam'] }),
    ]);
  };

  const save = useMutation({
    mutationFn: (input: OfficialSpotInput) =>
      isNew ? createAdminOfficialLocation(input) : updateAdminOfficialLocation(locationId, input),
    onSuccess: async (location) => {
      await refresh();
      showSaveConfirmation('Local do sistema salvo.');
      navigate(isNew ? routes.adminOfficialSpotEdit(location.id) : routes.adminOfficialSpots);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : 'Não foi possível salvar o local.');
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteAdminOfficialLocation(locationId ?? ''),
    onSuccess: async () => {
      await refresh();
      showSaveConfirmation('Local do sistema removido.');
      navigate(routes.adminOfficialSpots);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : 'Não foi possível excluir o local.');
    },
  });

  if (!isNew && list.isPending) {
    return <FeedbackState title="Abrindo o local" description="Carregando o cadastro." busy />;
  }
  if (!isNew && list.isSuccess && !editing) {
    return (
      <FeedbackState title="Local não encontrado" description="Esse cadastro não existe mais." />
    );
  }

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.adminOfficialSpots}>
        <ArrowLeft size={16} aria-hidden="true" />
        Locais do sistema
      </Link>
      <PageHeader
        eyebrow="Administração"
        title={isNew ? 'Novo local do sistema' : `Editar ${editing?.name ?? 'local'}`}
        description="Os mesmos dados de Meus locais, com habilitação, plano Free e câmera ao vivo."
      />
      {editing ? <WebcamManager spotId={editing.id} /> : null}
      <SpotForm
        variant="official"
        initial={editing}
        existing={list.data ?? []}
        isActive={editing?.isActive ?? true}
        isFreeDefault={editing?.isFreeDefault ?? false}
        submitLabel={isNew ? 'Cadastrar local' : 'Salvar alterações'}
        pending={save.isPending || remove.isPending}
        error={error}
        onSubmit={(input) => {
          setError(null);
          save.mutate(toOfficialInput(input));
        }}
        onDelete={
          editing
            ? () => {
                if (window.confirm(`Excluir ${editing.name}?`)) remove.mutate();
              }
            : undefined
        }
      />
    </div>
  );
}
