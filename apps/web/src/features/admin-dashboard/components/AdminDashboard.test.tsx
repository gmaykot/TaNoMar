import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { dashboardSample } from '../mappers/adminDashboardMapper.test';
import { parseAdminDashboard } from '../mappers/adminDashboardMapper';
import { AdminDashboard } from './AdminDashboard';

describe('AdminDashboard', () => {
  it('mostra KPIs e o que pede atenção', () => {
    renderWithProviders(
      <AdminDashboard
        snapshot={parseAdminDashboard(dashboardSample)}
        pending={false}
        error={false}
      />,
    );

    expect(screen.getByRole('link', { name: /Contas ativas/ })).toHaveAttribute(
      'href',
      '/admin/usuarios',
    );
    expect(screen.getByRole('link', { name: /Contas ativas/ })).toHaveTextContent('10');
    expect(screen.getByRole('link', { name: /Assinantes/ })).toHaveTextContent('4');
    expect(screen.getByRole('link', { name: /Fila de locais/ })).toHaveTextContent('2');
    expect(screen.getByText('R$ 54,70')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /2 locais na fila de moderação/ })).toHaveAttribute(
      'href',
      '/admin/locais',
    );
    expect(screen.getByRole('link', { name: /1 assinatura atrasada/ })).toHaveAttribute(
      'href',
      '/admin/usuarios',
    );
    expect(screen.getByRole('heading', { name: 'Atenção' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cida Souza/ })).toHaveAttribute(
      'href',
      '/admin/usuarios?busca=cida%40example.com',
    );
    expect(screen.getByText('Chrome no Android e Safari no iPhone')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Usuários' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Locais' })).toBeInTheDocument();
    expect(screen.getByText('Norte')).toBeInTheDocument();
    expect(screen.getByText('Sul')).toBeInTheDocument();
  });

  it('mostra o painel vazio quando nada pede atenção', () => {
    renderWithProviders(
      <AdminDashboard
        snapshot={parseAdminDashboard({
          ...dashboardSample,
          spots: { ...dashboardSample.spots, sharedPending: 0, officialWithoutCoordinates: 0 },
          billing: { ...dashboardSample.billing, pastDue: 0 },
          attention: { concurrentUses: [] },
        })}
        pending={false}
        error={false}
      />,
    );

    expect(screen.getByText('Nada pede atenção agora.')).toBeInTheDocument();
  });

  it('mostra carregamento e erro sem inventar números', () => {
    const { rerender } = renderWithProviders(<AdminDashboard pending error={false} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');

    rerender(<AdminDashboard pending={false} error />);
    expect(screen.getByText('Painel indisponível')).toBeInTheDocument();
  });
});
