import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { NavigateToLocationAction } from './NavigateToLocationAction';

const campeche = {
  locationId: 'campeche',
  name: 'Campeche',
  latitude: -27.65407,
  longitude: -48.46908,
};

describe('NavigateToLocationAction', () => {
  it('abre a gaveta com carro e barco quando o acesso não está definido', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavigateToLocationAction {...campeche} />);

    await user.click(screen.getByRole('button', { name: 'Como chegar' }));

    const dialog = screen.getByRole('dialog', { name: 'Campeche' });
    expect(screen.getByRole('img', { name: 'Mapa de Campeche' })).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Escolha como ir até o local.');
    expect(screen.getByRole('link', { name: /De carro/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=-27.65407%2C-48.46908&travelmode=driving',
    );
    expect(screen.getByRole('link', { name: /De barco/ })).toHaveAttribute(
      'href',
      '/locais/campeche/rumo',
    );
    expect(screen.getByText(/Não substitui carta náutica/)).toBeInTheDocument();
  });

  it('mostra só a rota de carro em acesso terrestre', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavigateToLocationAction {...campeche} accessType="terrestre" />);

    await user.click(screen.getByRole('button', { name: 'Como chegar' }));

    expect(screen.getByRole('link', { name: /De carro/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /De barco/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/carta náutica/)).not.toBeInTheDocument();
  });

  it('mostra caminhada em acesso por trilha', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavigateToLocationAction {...campeche} accessType="trilha" />);

    await user.click(screen.getByRole('button', { name: 'Como chegar' }));
    expect(screen.getByRole('link', { name: /A pé/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=-27.65407%2C-48.46908&travelmode=walking',
    );
  });

  it('usa rótulo de caiaque no rumo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavigateToLocationAction {...campeche} accessType="caiaque" />);

    await user.click(screen.getByRole('button', { name: 'Como chegar' }));
    expect(screen.getByRole('link', { name: /De caiaque/ })).toHaveAttribute(
      'href',
      '/locais/campeche/rumo',
    );
  });
});
