import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { OfflineSaveAction } from './OfflineSaveAction';

const { showSaveConfirmation } = vi.hoisted(() => ({
  showSaveConfirmation: vi.fn(),
}));

vi.mock('@/app/layout/saveConfirmationEvents', () => ({ showSaveConfirmation }));

describe('OfflineSaveAction', () => {
  beforeEach(() => {
    localStorage.removeItem('tanomar.offline-forecast.v1');
    showSaveConfirmation.mockClear();
  });

  it('pede confirmação antes de salvar a previsão', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(
      <OfflineSaveAction forecast={forecastFixture} savedForecast={null} onSaved={onSaved} />,
    );

    await user.click(screen.getByRole('button', { name: /Salvar para usar offline/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Salvar para usar offline?' });
    expect(dialog).toHaveTextContent('A previsão atual fica disponível sem internet neste aparelho');
    expect(localStorage.getItem('tanomar.offline-forecast.v1')).toBeNull();

    await user.click(within(dialog).getByRole('button', { name: 'Salvar offline' }));

    expect(onSaved).toHaveBeenCalledWith(forecastFixture);
    expect(showSaveConfirmation).toHaveBeenCalledWith('Previsão salva neste aparelho.');
    expect(localStorage.getItem('tanomar.offline-forecast.v1')).toContain('"forecast"');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('não grava a previsão se a confirmação for cancelada', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(
      <OfflineSaveAction forecast={forecastFixture} savedForecast={null} onSaved={onSaved} />,
    );

    await user.click(screen.getByRole('button', { name: /Salvar para usar offline/ }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem('tanomar.offline-forecast.v1')).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
    expect(showSaveConfirmation).not.toHaveBeenCalled();
  });

  it('avisa que a nova cópia substitui a previsão já salva', async () => {
    const user = userEvent.setup();
    render(
      <OfflineSaveAction
        forecast={forecastFixture}
        savedForecast={forecastFixture}
        onSaved={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Previsão salva neste aparelho/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Salvar para usar offline?' });
    expect(dialog).toHaveTextContent('Já existe uma previsão neste aparelho');
    expect(within(dialog).getByRole('button', { name: 'Atualizar cópia' })).toBeInTheDocument();
  });
});
