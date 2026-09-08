import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { WebcamManager } from './WebcamManager';

const { searchMutate, youtubeMutate, linkMutate } = vi.hoisted(() => ({
  searchMutate: vi.fn(),
  youtubeMutate: vi.fn(),
  linkMutate: vi.fn(),
}));

vi.mock('../hooks/useSpotWebcam', () => ({
  useSpotWebcam: () => ({
    webcam: { isPending: false, isError: false, data: { linked: false } },
    search: { isPending: false, mutate: searchMutate, data: undefined },
    youtubeLookup: { isPending: false, mutate: youtubeMutate, data: undefined },
    link: { isPending: false, mutate: linkMutate, variables: undefined },
    unlink: { isPending: false, mutate: vi.fn() },
    searchError: null,
    youtubeLookupError: null,
    linkError: null,
    unlinkError: null,
  }),
}));

describe('WebcamManager', () => {
  beforeEach(() => {
    searchMutate.mockClear();
    youtubeMutate.mockClear();
    linkMutate.mockClear();
  });

  it('admin inclui câmera pelo YouTube sem enviar URL no vínculo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WebcamManager spotId="campeche" admin />);
    expect(screen.getByRole('button', { name: 'Incluir do YouTube' })).toBeInTheDocument();
    expect(
      screen.getByText(/A transmissão é de terceiros/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Incluir do YouTube' }));
    await user.type(
      screen.getByLabelText(/Link da transmissão no YouTube/),
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(screen.getByText(/Só vinculamos transmissão no ar/)).toBeInTheDocument();
    expect(youtubeMutate).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(linkMutate).not.toHaveBeenCalled();
  });

  it('Capitão não vê o campo do YouTube', () => {
    renderWithProviders(<WebcamManager spotId="meu-local" />);
    expect(screen.queryByRole('button', { name: 'Incluir do YouTube' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Link da transmissão no YouTube/)).not.toBeInTheDocument();
  });
});
