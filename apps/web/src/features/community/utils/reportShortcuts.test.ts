import { describe, expect, it } from 'vitest';
import { reportShortcuts, shortcutForComment } from './reportShortcuts';

describe('reportShortcuts', () => {
  it('mapeia atalhos para os tipos oficiais da API', () => {
    expect(reportShortcuts.map((shortcut) => shortcut.type)).toEqual([
      'condicao',
      'condicao',
      'condicao',
      'perigo',
    ]);
  });

  it('reconhece o comentário pronto de um atalho', () => {
    expect(shortcutForComment('Deu peixe')?.id).toBe('deu-peixe');
    expect(shortcutForComment('Corrente forte')).toBeUndefined();
  });
});
