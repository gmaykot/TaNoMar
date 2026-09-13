import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { locationsFixture } from '@/features/locations/fixtures/locations';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LocationHeadingPage } from './LocationHeadingPage';

vi.mock('@/features/locations/services/locationsService', () => ({
  getLocations: () => Promise.resolve(locationsFixture),
}));

function renderHeading(path: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/locais/:locationId/rumo" element={<LocationHeadingPage />} />
    </Routes>,
    [path],
  );
}

describe('LocationHeadingPage', () => {
  it('mostra o rumo do local com aviso de carta náutica', async () => {
    renderHeading('/locais/campeche/rumo');

    expect(await screen.findByRole('heading', { name: 'Campeche' })).toBeInTheDocument();
    expect(
      screen.getByText('Distância em linha reta a partir da sua posição.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Não substitui carta náutica/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao local' })).toHaveAttribute(
      'href',
      '/locais/campeche',
    );
  });

  it('mostra estado amigável para local inexistente', async () => {
    renderHeading('/locais/nao-existe/rumo');
    expect(await screen.findByText('Local não encontrado')).toBeInTheDocument();
  });
});
