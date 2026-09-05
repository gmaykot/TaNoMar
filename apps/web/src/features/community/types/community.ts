export type ReportType = 'condicao' | 'perigo';
export type ReportVote = 'confirm' | 'contest';

export interface CommunityReport {
  id: string;
  spotId: string;
  spotName: string;
  type: ReportType;
  comment: string | null;
  authorName: string;
  createdAt: string;
  expiresAt: string;
  confirmations: number;
  contested: number;
  myVote: ReportVote | null;
  isMine: boolean;
}
