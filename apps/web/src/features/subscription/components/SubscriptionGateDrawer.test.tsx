import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SubscriptionGateDrawer } from './SubscriptionGateDrawer';

describe('SubscriptionGateDrawer', () => {
  it('confirma a navegação para os planos', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={<SubscriptionGateDrawer action="Planejar saída" onCancel={() => undefined} />}
        />
        <Route path="/premium" element={<p>Página de planos</p>} />
      </Routes>,
    );

    expect(screen.getByRole('dialog', { name: 'Ver os planos?' })).toHaveTextContent(
      'Planejar saída está na Assinatura. Continuar abre a página de planos.',
    );
    await user.click(screen.getByRole('button', { name: 'Ver planos' }));
    expect(await screen.findByText('Página de planos')).toBeInTheDocument();
  });
});
