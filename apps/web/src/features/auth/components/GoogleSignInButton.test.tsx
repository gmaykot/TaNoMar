import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { mountGoogleSignInButton } from '../googleIdentity';
import { GoogleSignInButton } from './GoogleSignInButton';

vi.mock('@/shared/api/env', () => ({
  googleClientId: 'test-client.apps.googleusercontent.com',
}));

function mockGoogleId() {
  const initialize = vi.fn();
  const renderButton = vi.fn((parent: HTMLElement) => {
    parent.appendChild(document.createElement('iframe'));
  });
  const disableAutoSelect = vi.fn();
  const cancel = vi.fn();

  window.google = {
    accounts: {
      id: { initialize, renderButton, disableAutoSelect, cancel },
    },
  };

  return { initialize, renderButton, disableAutoSelect, cancel };
}

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    document.head.replaceChildren();
  });

  afterEach(() => {
    delete window.google;
  });

  it('desenha o botão oficial e o recoloca depois de desmontar', async () => {
    const googleId = mockGoogleId();
    const onCredential = vi.fn();
    const first = render(<GoogleSignInButton onCredential={onCredential} />);

    await waitFor(() => {
      expect(googleId.initialize).toHaveBeenCalledTimes(1);
      expect(googleId.renderButton).toHaveBeenCalledTimes(1);
      expect(
        screen.getByRole('group', { name: 'Entrar com Google' }).querySelector('iframe'),
      ).toBeTruthy();
    });

    first.unmount();
    render(<GoogleSignInButton onCredential={onCredential} />);

    await waitFor(() => {
      expect(
        screen.getByRole('group', { name: 'Entrar com Google' }).querySelector('iframe'),
      ).toBeTruthy();
    });
    expect(googleId.initialize).toHaveBeenCalledTimes(1);
    expect(googleId.renderButton).toHaveBeenCalledTimes(2);
  });

  it('repinta o botão depois do remount do Strict Mode', async () => {
    const googleId = mockGoogleId();
    render(
      <StrictMode>
        <GoogleSignInButton onCredential={vi.fn()} />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('group', { name: 'Entrar com Google' }).querySelector('iframe'),
      ).toBeTruthy();
    });
    expect(googleId.renderButton).toHaveBeenCalled();
  });

  it('não pinta quando o mount foi abortado', async () => {
    const googleId = mockGoogleId();
    const parent = document.createElement('div');
    const controller = new AbortController();
    controller.abort();

    await mountGoogleSignInButton(parent, controller.signal);

    expect(googleId.renderButton).not.toHaveBeenCalled();
    expect(parent.childElementCount).toBe(0);
  });
});

