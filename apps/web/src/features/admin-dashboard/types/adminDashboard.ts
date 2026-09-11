export interface AdminDashboardCount {
  code: string;
  name: string;
  count: number;
}

export interface AdminDashboardUsers {
  total: number;
  active: number;
  blocked: number;
  admins: number;
  paid: number;
  newLast7Days: number;
  newLast30Days: number;
  byPlan: AdminDashboardCount[];
}

export interface AdminDashboardSpots {
  official: number;
  officialEnabled: number;
  officialDisabled: number;
  officialFreeDefault: number;
  officialWithoutCoordinates: number;
  officialWithWebcam: number;
  personal: number;
  sharedApproved: number;
  sharedPending: number;
  byRegion: AdminDashboardCount[];
}

export interface AdminDashboardBilling {
  active: number;
  cancelAtPeriodEnd: number;
  pastDue: number;
  pendingCheckout: number;
  canceledWithAccess: number;
  monthlyCount: number;
  yearlyCount: number;
  monthlyRecurringCents: number;
}

export interface AdminDashboardEngagement {
  activeAlerts: number;
  pushDevices: number;
  favorites: number;
  enabledSpots: number;
  activeReports: number;
  reportsLast7Days: number;
  reportsLast30Days: number;
}

export interface AdminDashboardPartners {
  published: number;
  unpublished: number;
  featured: number;
}

export interface AdminDashboardSnapshot {
  generatedAt: string;
  users: AdminDashboardUsers;
  spots: AdminDashboardSpots;
  billing: AdminDashboardBilling;
  engagement: AdminDashboardEngagement;
  partners: AdminDashboardPartners;
}
