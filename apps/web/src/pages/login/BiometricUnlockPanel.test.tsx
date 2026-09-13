import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { BiometricUnlockPanel } from './BiometricUnlockPanel';

describe('BiometricUnlockPanel', () => {
  it('pede a biometria e permite cair no Google', async () => {
    const user = userEvent.setup();
    const onUnlock = vi.fn(() => Promise.resolve());
    const onUseGoogle = vi.fn();
    renderWithProviders(<BiometricUnlockPanel onUnlock={onUnlock} onUseGoogle={onUseGoogle} />);

    expect(screen.getByRole('heading', { name: 'Confirme que é você.' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Usar biometria' }));
    expect(onUnlock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Entrar com Google' }));
    expect(onUseGoogle).toHaveBeenCalledTimes(1);
  });
});
