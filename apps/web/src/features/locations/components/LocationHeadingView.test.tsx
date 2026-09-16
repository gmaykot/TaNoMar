import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LocationHeadingView } from './LocationHeadingView';

const base = {
  name: 'Campeche',
  latitude: -27.65407,
  longitude: -48.46908,
  heading: null as number | null,
  compassTracking: false,
  onToggleCompass: vi.fn(),
};

describe('LocationHeadingView', () => {
  it('mostra rumo e distância quando o GPS responde', () => {
    renderWithProviders(
      <LocationHeadingView
        {...base}
        geoStatus="ready"
        userLatitude={-27.65407}
        userLongitude={-48.47908}
        accuracy={12}
      />,
    );

    expect(screen.getByRole('img', { name: /Rumo/ })).toHaveAccessibleName(/Leste/);
    expect(screen.getByText('Distância em linha reta').parentElement).toHaveTextContent(/km| m/);
    expect(screen.getByRole('img', { name: 'Mapa de Campeche' })).toBeInTheDocument();
    expect(screen.getByText(/Não use para navegação oficial/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir no mapa' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=-27.65407%2C-48.46908',
    );
    expect(screen.getByRole('button', { name: 'Manter rumo' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('explica quando a localização foi bloqueada', () => {
    renderWithProviders(
      <LocationHeadingView
        {...base}
        geoStatus="denied"
        userLatitude={null}
        userLongitude={null}
        accuracy={null}
      />,
    );

    expect(screen.getByText('Localização bloqueada')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('liga a bússola ao tocar em manter rumo', async () => {
    const user = userEvent.setup();
    const onToggleCompass = vi.fn();
    renderWithProviders(
      <LocationHeadingView
        {...base}
        geoStatus="locating"
        userLatitude={null}
        userLongitude={null}
        accuracy={null}
        onToggleCompass={onToggleCompass}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Manter rumo' }));
    expect(onToggleCompass).toHaveBeenCalled();
  });

  it('mostra rumo ativo quando a bússola está ligada', async () => {
    const user = userEvent.setup();
    const onToggleCompass = vi.fn();
    renderWithProviders(
      <LocationHeadingView
        {...base}
        geoStatus="ready"
        userLatitude={-27.65407}
        userLongitude={-48.47908}
        accuracy={12}
        heading={40}
        compassTracking
        onToggleCompass={onToggleCompass}
      />,
    );

    const keep = screen.getByRole('button', { name: 'Rumo ativo' });
    expect(keep).toHaveAttribute('aria-pressed', 'true');
    await user.click(keep);
    expect(onToggleCompass).toHaveBeenCalled();
  });
});
