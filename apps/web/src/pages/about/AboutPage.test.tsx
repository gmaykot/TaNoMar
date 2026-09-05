import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AboutPage } from './AboutPage';

describe('AboutPage', () => {
  it('mostra as fontes, a atribuição do Open-Meteo e o aviso', () => {
    renderWithProviders(<AboutPage />);

    expect(
      screen.getByRole('heading', { name: 'De onde vêm as informações.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Clima e mar/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Nota de pesca/ })).toBeInTheDocument();
    expect(screen.getByText(/média das 3 melhores horas entre 5h e 20h/)).toBeInTheDocument();
    expect(screen.getByText(/8,5 ou mais — Excelente/)).toBeInTheDocument();
    expect(screen.getByText(/não entram na nota/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Locais/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Comunidade/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Aviso/ })).toBeInTheDocument();

    const attribution = screen.getByRole('link', { name: 'Weather data by Open-Meteo.com' });
    expect(attribution).toHaveAttribute('href', 'https://open-meteo.com/');
    expect(attribution).toHaveAttribute('target', '_blank');

    expect(screen.getByText(/não substitui o que você vê no local/)).toBeInTheDocument();
  });
});
