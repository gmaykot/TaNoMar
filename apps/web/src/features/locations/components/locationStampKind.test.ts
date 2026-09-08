import { describe, expect, it } from 'vitest';
import { locationStampKind } from './locationStampKind';

describe('locationStampKind', () => {
  it('marca Meu local só para o dono, mesmo quando o local é compartilhado', () => {
    expect(locationStampKind({ isOwner: true, visibility: 'shared' })).toBe('owner');
    expect(locationStampKind({ isOwner: true, visibility: 'private' })).toBe('owner');
  });

  it('marca Compartilhado para a comunidade em local compartilhado', () => {
    expect(locationStampKind({ isOwner: false, visibility: 'shared' })).toBe('shared');
  });

  it('omite o carimbo em local oficial de outra pessoa', () => {
    expect(locationStampKind({ isOwner: false, visibility: 'official' })).toBeNull();
    expect(locationStampKind({ isOwner: false })).toBeNull();
  });
});
