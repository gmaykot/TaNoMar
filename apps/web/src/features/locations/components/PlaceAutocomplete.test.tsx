import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { PlaceSuggestion } from '../types/place';
import { PlaceAutocomplete } from './PlaceAutocomplete';

const sample: PlaceSuggestion = {
  name: 'Praia do Campeche',
  formatted: 'Praia do Campeche, Florianópolis - SC, Brasil',
  city: 'Florianópolis',
  state: 'SC',
  category: 'beach',
  latitude: -27.68,
  longitude: -48.48,
};

vi.mock('../hooks/usePlaceSearch', () => ({
  usePlaceSearch: (query: string) => ({
    items: query.trim().length >= 3 ? [sample] : [],
    isFetching: false,
    error: false,
  }),
}));

describe('PlaceAutocomplete', () => {
  it('mostra sugestões e seleciona um lugar', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    function Harness() {
      const [value, setValue] = useState('');
      return <PlaceAutocomplete value={value} onChange={setValue} onSelect={onSelect} />;
    }

    renderWithProviders(<Harness />);
    await user.type(screen.getByRole('combobox'), 'campeche');

    expect(screen.getByRole('option', { name: /Praia do Campeche/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Powered by Geoapify' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /Praia do Campeche/ }));
    expect(onSelect).toHaveBeenCalledWith(sample);
  });

  it('marca sugestão já cadastrada', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState('');
      return (
        <PlaceAutocomplete
          value={value}
          onChange={setValue}
          onSelect={vi.fn()}
          isRegistered={() => true}
        />
      );
    }

    renderWithProviders(<Harness />);
    await user.type(screen.getByRole('combobox'), 'campeche');
    const option = screen.getByRole('option', { name: /Já cadastrado/ });
    expect(option).toHaveAttribute('data-registered', 'true');
  });
});
