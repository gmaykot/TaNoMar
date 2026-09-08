import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { ApiError } from '@/shared/api/errors';
import { locationsQueryKey } from '@/features/locations/hooks/useLocationMutations';
import {
  getSpotWebcam,
  linkSpotWebcam,
  lookupYouTubeWebcam,
  searchSpotWebcams,
  unlinkSpotWebcam,
} from '../services/webcamService';
import type { WebcamLinkInput } from '../types/webcam';

export const webcamQueryKey = (spotId: string, admin: boolean) =>
  ['webcam', spotId, admin] as const;

export function providerErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.code === 'webcam_provider_unavailable') {
      return 'Não foi possível consultar as câmeras agora. Tente novamente em alguns minutos.';
    }
    if (error.code === 'webcam_unconfigured') {
      return 'A pesquisa de câmeras ao vivo não está disponível neste ambiente.';
    }
    return error.message;
  }
  return fallback;
}

export function useSpotWebcam(
  spotId: string,
  options: { admin?: boolean; enabled?: boolean } = {},
) {
  const admin = options.admin === true;
  const queryClient = useQueryClient();
  const webcam = useQuery({
    queryKey: webcamQueryKey(spotId, admin),
    queryFn: () => getSpotWebcam(spotId, admin),
    enabled: Boolean(spotId) && options.enabled !== false,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: webcamQueryKey(spotId, admin) }),
      queryClient.invalidateQueries({ queryKey: webcamQueryKey(spotId, !admin) }),
      queryClient.invalidateQueries({ queryKey: locationsQueryKey }),
      queryClient.invalidateQueries({ queryKey: ['location-forecast'] }),
    ]);
  };

  const search = useMutation({
    mutationFn: () => searchSpotWebcams(spotId, admin),
  });
  const youtubeLookup = useMutation({
    mutationFn: (query: string) => lookupYouTubeWebcam(spotId, query),
  });
  const link = useMutation({
    mutationFn: (input: WebcamLinkInput) => linkSpotWebcam(spotId, input, admin),
    onSuccess: async () => {
      showSaveConfirmation('Câmera vinculada.');
      await invalidate();
    },
  });
  const unlink = useMutation({
    mutationFn: () => unlinkSpotWebcam(spotId, admin),
    onSuccess: async () => {
      showSaveConfirmation('Câmera removida.');
      await invalidate();
    },
  });

  return {
    webcam,
    search,
    youtubeLookup,
    link,
    unlink,
    searchError: search.isError
      ? providerErrorMessage(search.error, 'Não foi possível consultar as câmeras agora.')
      : null,
    youtubeLookupError: youtubeLookup.isError
      ? providerErrorMessage(
          youtubeLookup.error,
          'Não foi possível consultar essa transmissão do YouTube.',
        )
      : null,
    linkError: link.isError
      ? providerErrorMessage(link.error, 'Não foi possível vincular a câmera.')
      : null,
    unlinkError: unlink.isError
      ? providerErrorMessage(unlink.error, 'Não foi possível remover a câmera.')
      : null,
  };
}
