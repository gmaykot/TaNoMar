export type AdminProtection = 'self' | 'bootstrap' | 'last_admin';
export type AdminPlanCode = 'free' | 'arrais' | 'premium' | 'capitao';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  pictureUrl: string | null;
  role: string;
  isActive: boolean;
  plan: {
    code: string;
    name: string;
  };
  createdAt: string;
  accessCount: number;
  lastAccessAt: string | null;
  isSelf: boolean;
  protection: AdminProtection | null;
  canChangePlan: boolean;
  canDeactivate: boolean;
  canDelete: boolean;
  canChangeRole: boolean;
}
