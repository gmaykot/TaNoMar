import { describe, expect, it } from 'vitest';
import { locationStampKind, locationStampKinds } from './locationStampKind';

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

describe('locationStampKinds', () => {
  it('acrescenta Favorito sem substituir Meu local', () => {
    expect(locationStampKinds({ isOwner: true, visibility: 'shared', isFavorite: true })).toEqual([
      'owner',
      'favorite',
    ]);
  });

  it('acrescenta Favorito sem substituir Compartilhado', () => {
    expect(locationStampKinds({ isOwner: false, visibility: 'shared', isFavorite: true })).toEqual([
      'shared',
      'favorite',
    ]);
  });

  it('mostra só Favorito em local oficial de outra pessoa', () => {
    expect(locationStampKinds({ isOwner: false, visibility: 'official', isFavorite: true })).toEqual([
      'favorite',
    ]);
  });

  it('omite carimbos quando não há dono, comunidade nem favorito', () => {
    expect(locationStampKinds({ isOwner: false, visibility: 'official', isFavorite: false })).toEqual(
      [],
    );
  });
});
