import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DisconnectReason } from '@whiskeysockets/baileys';
import { isFatalDisconnect, reconnectDelayMs, shouldAutoReconnect } from './reconnect.js';

test('reconecta quedas temporárias e 515', () => {
  assert.equal(shouldAutoReconnect(DisconnectReason.restartRequired), true);
  assert.equal(shouldAutoReconnect(DisconnectReason.connectionLost), true);
  assert.equal(shouldAutoReconnect(DisconnectReason.timedOut), true);
  assert.equal(shouldAutoReconnect(undefined), true);
});

test('não reconecta logout, sessão inválida ou substituição', () => {
  assert.equal(isFatalDisconnect(DisconnectReason.loggedOut), true);
  assert.equal(shouldAutoReconnect(DisconnectReason.loggedOut), false);
  assert.equal(shouldAutoReconnect(DisconnectReason.badSession), false);
  assert.equal(shouldAutoReconnect(DisconnectReason.connectionReplaced), false);
});

test('515 reconecta rápido e as demais usam backoff', () => {
  assert.equal(reconnectDelayMs(1, DisconnectReason.restartRequired), 1_000);
  assert.equal(reconnectDelayMs(1, DisconnectReason.connectionLost), 2_000);
  assert.equal(reconnectDelayMs(3, DisconnectReason.connectionLost), 8_000);
  assert.equal(reconnectDelayMs(10, DisconnectReason.connectionLost), 60_000);
});
