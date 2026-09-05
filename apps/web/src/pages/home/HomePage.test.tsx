import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { renderWithProviders } from '@/test/renderWithProviders';
import { HomePage } from './HomePage';

vi.mock('@/features/forecast/services/forecastService', () => ({
  getForecast: () => Promise.resolve(forecastFixture),
  getLocationForecast: () => Promise.resolve(null),
}));

describe('HomePage', () => {
  it('troca a melhor escolha quando a data muda', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Amanhã/ }));
    expect(screen.getByRole('heading', { name: 'Armação' })).toBeInTheDocument();
  });

  it('expõe a previsão do dia como carrossel', async () => {
    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();
    expect(screen.getByLabelText('Previsão por dia')).toHaveAttribute(
      'aria-roledescription',
      'carrossel',
    );
    expect(screen.getByRole('button', { name: /Hoje/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Amanhã/ })).toBeInTheDocument();
  });

  it('troca o dia ao arrastar o carrossel', async () => {
    renderWithProviders(<HomePage />);
    expect(await screen.findByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();

    const track = screen.getByLabelText('Previsão por dia');
    const slides = [...track.querySelectorAll<HTMLElement>('[data-snap-key]')];
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 320 });
    Object.defineProperty(track, 'scrollLeft', { configurable: true, writable: true, value: 320 });
    slides.forEach((slide, index) => {
      Object.defineProperty(slide, 'offsetLeft', { configurable: true, value: index * 320 });
      Object.defineProperty(slide, 'offsetWidth', { configurable: true, value: 320 });
    });

    track.dispatchEvent(new Event('scrollend'));
    track.dispatchEvent(new Event('scroll'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Armação' })).toBeInTheDocument();
    });
  });
});
