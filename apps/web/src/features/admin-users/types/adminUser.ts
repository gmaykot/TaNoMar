export type AdminProtection = 'self' | 'bootstrap' | 'last_admin';

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
  isSelf: boolean;
  protection: AdminProtection | null;
  canChangePlan: boolean;
  canDeactivate: boolean;
}
