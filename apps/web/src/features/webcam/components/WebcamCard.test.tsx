import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { WebcamCard } from './WebcamCard';
import { WebcamPremiumGate } from './WebcamPremiumGate';
import type { SpotWebcam } from '../types/webcam';

const live: SpotWebcam = {
  linked: true,
  provider: 'windy',
  providerDisplayName: 'Windy',
  externalId: '123',
  name: 'Praia do Campeche',
  latitude: -27.65,
  longitude: -48.46,
  isAvailable: true,
  isLive: true,
  player: { kind: 'embed', embedUrl: 'https://webcams.windy.com/embed/123/live' },
};

describe('WebcamCard', () => {
  it('não inicia o player sozinho', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WebcamCard webcam={live} />);
    expect(screen.getByRole('heading', { name: 'Praia do Campeche' })).toBeInTheDocument();
    expect(screen.queryByTitle('Câmera ao vivo: Praia do Campeche')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver câmera ao vivo' }));
    expect(screen.getByTitle('Câmera ao vivo: Praia do Campeche')).toHaveAttribute(
      'src',
      'https://webcams.windy.com/embed/123/live',
    );
  });

  it('não oferece player quando a câmera está indisponível', () => {
    renderWithProviders(
      <WebcamCard webcam={{ ...live, isAvailable: false, isLive: false, player: null }} />,
    );
    expect(screen.queryByRole('button', { name: 'Ver câmera ao vivo' })).not.toBeInTheDocument();
    expect(screen.getByText('A câmera vinculada não está disponível agora.')).toBeInTheDocument();
  });
});

describe('WebcamPremiumGate', () => {
  it('divulga o plano Capitão sem player', () => {
    renderWithProviders(<WebcamPremiumGate />);
    expect(screen.getByRole('heading', { name: 'Recurso do plano Capitão' })).toBeInTheDocument();
    expect(screen.queryByTitle(/Câmera ao vivo/)).not.toBeInTheDocument();
  });
});
