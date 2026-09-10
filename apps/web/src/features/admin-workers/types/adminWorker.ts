export type AdminWorkerKind = 'scheduled' | 'queue';

export interface AdminWorker {
  key: string;
  name: string;
  kind: AdminWorkerKind;
  enabled: boolean;
  cronExpression: string | null;
  timeZone: string;
  description: string;
  usedBy: string;
  dataSource: string;
}

export interface AdminWorkerUpdate {
  isEnabled: boolean;
  cronExpression: string | null;
}
