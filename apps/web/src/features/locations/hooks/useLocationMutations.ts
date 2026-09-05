import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/errors';
import {
  createLocation,
  deleteLocation,
  setFavorite,
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
    await queryClient.invalidateQueries({ queryKey: locationsQueryKey });
  };

  const create = useMutation({
    mutationFn: createLocation,
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PersonalSpotInput }) =>
      updateLocation(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: deleteLocation,
    onSuccess: invalidate,
  });
  const favorite = useMutation({
    mutationFn: ({ spotId, isFavorite }: { spotId: string; isFavorite: boolean }) =>
      setFavorite(spotId, isFavorite),
    onSuccess: invalidate,
  });

  return {
    create,
    update,
    remove,
    favorite,
    createError: create.isError
      ? mutationError(create.error, 'Não foi possível salvar o local.')
      : null,
    updateError: update.isError
      ? mutationError(update.error, 'Não foi possível atualizar o local.')
      : null,
    favoriteError: favorite.isError
      ? mutationError(favorite.error, 'Não foi possível atualizar os favoritos.')
      : null,
  };
}
