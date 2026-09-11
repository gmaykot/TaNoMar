import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { ApiError } from '@/shared/api/errors';
import {
  createLocation,
  deleteLocation,
  setEnabled,
  setFavorite,
  setIdealWind,
  updateLocation,
  type PersonalSpotInput,
} from '../services/locationsService';

export const locationsQueryKey = ['locations'] as const;

function mutationError(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useLocationMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: locationsQueryKey }),
      queryClient.invalidateQueries({ queryKey: ['forecast'] }),
      queryClient.invalidateQueries({ queryKey: ['location-forecast'] }),
    ]);
  };

  const create = useMutation({
    mutationFn: createLocation,
    onSuccess: async () => {
      showSaveConfirmation('Local salvo.');
      await invalidate();
    },
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PersonalSpotInput }) =>
      updateLocation(id, input),
    onSuccess: async () => {
      showSaveConfirmation('Alterações do local salvas.');
      await invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: deleteLocation,
    onSuccess: invalidate,
  });
  const favorite = useMutation({
    mutationFn: ({ spotId, isFavorite }: { spotId: string; isFavorite: boolean }) =>
      setFavorite(spotId, isFavorite),
    onSuccess: async () => {
      showSaveConfirmation('Favoritos atualizados.');
      await invalidate();
    },
  });
  const enabled = useMutation({
    mutationFn: ({ spotId, isEnabled }: { spotId: string; isEnabled: boolean }) =>
      setEnabled(spotId, isEnabled),
    onSuccess: async () => {
      showSaveConfirmation('Preferência de previsão salva.');
      await invalidate();
    },
  });
  const idealWind = useMutation({
    mutationFn: ({
      spotId,
      idealWindDirectionDegrees,
    }: {
      spotId: string;
      idealWindDirectionDegrees: number | null;
    }) => setIdealWind(spotId, idealWindDirectionDegrees),
    onSuccess: async () => {
      showSaveConfirmation('Vento ideal salvo.');
      await invalidate();
    },
  });

  return {
    create,
    update,
    remove,
    favorite,
    enabled,
    idealWind,
    createError: create.isError
      ? mutationError(create.error, 'Não foi possível salvar o local.')
      : null,
    updateError: update.isError
      ? mutationError(update.error, 'Não foi possível atualizar o local.')
      : null,
    removeError: remove.isError
      ? mutationError(remove.error, 'Não foi possível excluir o local.')
      : null,
    favoriteError: favorite.isError
      ? mutationError(favorite.error, 'Não foi possível atualizar os favoritos.')
      : null,
    enabledError: enabled.isError
      ? mutationError(enabled.error, 'Não foi possível atualizar o uso nas previsões.')
      : null,
    idealWindError: idealWind.isError
      ? mutationError(idealWind.error, 'Não foi possível salvar o vento ideal.')
      : null,
  };
}
