import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminHomePage } from './AdminHomePage';

describe('AdminHomePage', () => {
  it('abre as áreas administrativas', () => {
    renderWithProviders(<AdminHomePage />);
    expect(screen.getByRole('link', { name: /Moderação/ })).toHaveAttribute(
      'href',
      '/admin/locais',
    );
    expect(screen.getByRole('link', { name: /Usuários/ })).toHaveAttribute(
      'href',
      '/admin/usuarios',
    );
    expect(screen.getByRole('link', { name: /Parceiros/ })).toHaveAttribute(
      'href',
      '/admin/parceiros',
    );
  });
});
