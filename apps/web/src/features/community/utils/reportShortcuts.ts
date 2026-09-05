import type { ReportType } from '../types/community';

export interface ReportShortcut {
  id: string;
  label: string;
  hint: string;
  type: ReportType;
  comment: string;
  tone: 'catch' | 'good' | 'bad' | 'danger';
}

export const reportShortcuts: ReportShortcut[] = [
  {
    id: 'deu-peixe',
    label: 'Deu peixe',
    hint: 'Teve captura',
    type: 'condicao',
    comment: 'Deu peixe',
    tone: 'catch',
  },
  {
    id: 'mar-bom',
    label: 'Mar bom',
    hint: 'Condição favorável',
    type: 'condicao',
    comment: 'Mar bom para pescar',
    tone: 'good',
  },
  {
    id: 'mar-ruim',
    label: 'Mar ruim',
    hint: 'Condição fraca',
    type: 'condicao',
    comment: 'Mar ruim',
    tone: 'bad',
  },
  {
    id: 'perigo',
    label: 'Perigo',
    hint: 'Risco no local',
    type: 'perigo',
    comment: 'Atenção: perigo no local',
    tone: 'danger',
  },
];

export function shortcutForComment(comment: string | null) {
  if (!comment) return undefined;
  return reportShortcuts.find((shortcut) => shortcut.comment === comment);
}
