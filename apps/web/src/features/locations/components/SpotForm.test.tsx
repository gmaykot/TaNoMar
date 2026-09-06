import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { PlaceSuggestion } from '../types/place';
import { SpotForm } from './SpotForm';

const sample: PlaceSuggestion = {
  name: 'Praia do Campeche',
  formatted: 'Praia do Campeche, Florianópolis - SC, Brasil',
  city: 'Florianópolis',
  state: 'SC',
  category: 'beach',
  latitude: -27.68123,
  longitude: -48.48111,
};

const { usePlaceSearch } = vi.hoisted(() => ({
  usePlaceSearch: vi.fn((query: string) => ({
    items: query.trim().length >= 3 ? [sample] : [],
    isFetching: false,
    error: false,
  })),
}));

vi.mock('../hooks/usePlaceSearch', () => ({ usePlaceSearch }));

describe('SpotForm', () => {
  it('preenche cidade, coordenadas e nome vazio ao escolher um lugar', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(
      <SpotForm submitLabel="Salvar local" pending={false} error={null} onSubmit={onSubmit} />,
    );

    await user.type(screen.getByRole('combobox', { name: /Buscar local/i }), 'cam');
    await user.click(screen.getByRole('option', { name: /Praia do Campeche/ }));

    expect(screen.getByLabelText('Nome do local')).toHaveValue('Praia do Campeche');
    expect(screen.getByLabelText('Latitude')).toHaveValue('-27.68123');
    expect(screen.getByLabelText('Longitude')).toHaveValue('-48.48111');
    expect(screen.getByRole('combobox', { name: /Buscar local/i })).toHaveValue(sample.formatted);

    await user.click(screen.getByRole('button', { name: 'Salvar local' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Praia do Campeche',
        city: 'Florianópolis',
        state: 'SC',
        latitude: -27.68123,
        longitude: -48.48111,
      }),
    );
  });

  it('não sobrescreve o nome já preenchido', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SpotForm submitLabel="Salvar local" pending={false} error={null} onSubmit={vi.fn()} />,
    );

    await user.type(screen.getByLabelText('Nome do local'), 'Meu ponto');
    await user.type(screen.getByRole('combobox', { name: /Buscar local/i }), 'cam');
    await user.click(screen.getByRole('option', { name: /Praia do Campeche/ }));

    expect(screen.getByLabelText('Nome do local')).toHaveValue('Meu ponto');
  });

  it('bloqueia o cadastro quando já existe um local próximo', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(
      <SpotForm
        existing={[
          {
            id: 'campeche',
            name: 'Campeche',
            city: 'Florianópolis',
            state: 'SC',
            region: 'Sul da ilha',
            description: null,
            type: 'praia',
            visibility: 'official',
            profile: 'praia_aberta',
            latitude: sample.latitude,
            longitude: sample.longitude,
            seaOrientationDegrees: 90,
            isFavorite: false,
            isEnabled: true,
            isInRanking: true,
            isApproved: true,
            isOwner: false,
          },
        ]}
        submitLabel="Salvar local"
        pending={false}
        error={null}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByRole('combobox', { name: /Buscar local/i }), 'cam');
    await user.click(screen.getByRole('option', { name: /Praia do Campeche/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/Já existe um local muito próximo/);
    expect(screen.getByRole('link', { name: 'Campeche' })).toHaveAttribute(
      'href',
      '/locais/campeche',
    );
    expect(screen.getByRole('button', { name: 'Salvar local' })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
