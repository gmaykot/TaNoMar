import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PartnerApplicationPage } from './PartnerApplicationPage';

const { createPartnerApplication } = vi.hoisted(() => ({
  createPartnerApplication: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/features/partners/services/partnersService', () => ({
  createPartnerApplication,
}));

describe('PartnerApplicationPage', () => {
  it('envia o pré-cadastro e confirma que ele aguarda análise', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PartnerApplicationPage />);

    await user.type(screen.getByRole('textbox', { name: 'Nome do negócio' }), 'Iscas da Ilha');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Categoria' }), 'guia');
    await user.type(screen.getByRole('textbox', { name: 'Cidade' }), 'Florianópolis');
    await user.type(screen.getByRole('textbox', { name: 'WhatsApp com DDD' }), '(48) 99999-9999');
    await user.click(screen.getByRole('button', { name: 'Enviar solicitação' }));

    expect(createPartnerApplication.mock.calls[0]?.[0]).toEqual({
      name: 'Iscas da Ilha',
      category: 'guia',
      city: 'Florianópolis',
      whatsApp: '(48) 99999-9999',
    });
    expect(await screen.findByRole('heading', { name: 'Solicitação enviada' })).toBeInTheDocument();
    expect(screen.getByText(/aguardando análise/i)).toBeInTheDocument();
  });
});
