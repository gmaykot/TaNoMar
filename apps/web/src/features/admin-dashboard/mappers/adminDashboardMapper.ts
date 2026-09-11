import { ContractError } from '@/shared/api/errors';
import type {
  AdminDashboardBilling,
  AdminDashboardCount,
  AdminDashboardEngagement,
  AdminDashboardPartners,
  AdminDashboardSnapshot,
  AdminDashboardSpots,
  AdminDashboardUsers,
} from '../types/adminDashboard';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function readString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function parseCount(value: unknown): AdminDashboardCount {
  if (!isRecord(value)) throw new ContractError('Contagem do dashboard inválida.');
  const code = readString(value.code);
  const name = readString(value.name);
  const count = readInteger(value.count);
  if (!code || !name || count === null)
    throw new ContractError('Contagem do dashboard incompleta.');
  return { code, name, count };
}

function parseCounts(value: unknown) {
  if (!Array.isArray(value)) throw new ContractError('Lista de contagens inválida.');
  return value.map(parseCount);
}

function parseUsers(value: unknown): AdminDashboardUsers {
  if (!isRecord(value)) throw new ContractError('KPIs de usuários inválidos.');
  const total = readInteger(value.total);
  const active = readInteger(value.active);
  const blocked = readInteger(value.blocked);
  const admins = readInteger(value.admins);
  const paid = readInteger(value.paid);
  const newLast7Days = readInteger(value.newLast7Days);
  const newLast30Days = readInteger(value.newLast30Days);
  if (
    total === null ||
    active === null ||
    blocked === null ||
    admins === null ||
    paid === null ||
    newLast7Days === null ||
    newLast30Days === null
  ) {
    throw new ContractError('KPIs de usuários incompletos.');
  }
  return {
    total,
    active,
    blocked,
    admins,
    paid,
    newLast7Days,
    newLast30Days,
    byPlan: parseCounts(value.byPlan),
  };
}

function parseSpots(value: unknown): AdminDashboardSpots {
  if (!isRecord(value)) throw new ContractError('KPIs de locais inválidos.');
  const official = readInteger(value.official);
  const officialEnabled = readInteger(value.officialEnabled);
  const officialDisabled = readInteger(value.officialDisabled);
  const officialFreeDefault = readInteger(value.officialFreeDefault);
  const officialWithoutCoordinates = readInteger(value.officialWithoutCoordinates);
  const officialWithWebcam = readInteger(value.officialWithWebcam);
  const personal = readInteger(value.personal);
  const sharedApproved = readInteger(value.sharedApproved);
  const sharedPending = readInteger(value.sharedPending);
  if (
    official === null ||
    officialEnabled === null ||
    officialDisabled === null ||
    officialFreeDefault === null ||
    officialWithoutCoordinates === null ||
    officialWithWebcam === null ||
    personal === null ||
    sharedApproved === null ||
    sharedPending === null
  ) {
    throw new ContractError('KPIs de locais incompletos.');
  }
  return {
    official,
    officialEnabled,
    officialDisabled,
    officialFreeDefault,
    officialWithoutCoordinates,
    officialWithWebcam,
    personal,
    sharedApproved,
    sharedPending,
    byRegion: parseCounts(value.byRegion),
  };
}

function parseBilling(value: unknown): AdminDashboardBilling {
  if (!isRecord(value)) throw new ContractError('KPIs de assinatura inválidos.');
  const active = readInteger(value.active);
  const cancelAtPeriodEnd = readInteger(value.cancelAtPeriodEnd);
  const pastDue = readInteger(value.pastDue);
  const pendingCheckout = readInteger(value.pendingCheckout);
  const canceledWithAccess = readInteger(value.canceledWithAccess);
  const monthlyCount = readInteger(value.monthlyCount);
  const yearlyCount = readInteger(value.yearlyCount);
  const monthlyRecurringCents = readInteger(value.monthlyRecurringCents);
  if (
    active === null ||
    cancelAtPeriodEnd === null ||
    pastDue === null ||
    pendingCheckout === null ||
    canceledWithAccess === null ||
    monthlyCount === null ||
    yearlyCount === null ||
    monthlyRecurringCents === null
  ) {
    throw new ContractError('KPIs de assinatura incompletos.');
  }
  return {
    active,
    cancelAtPeriodEnd,
    pastDue,
    pendingCheckout,
    canceledWithAccess,
    monthlyCount,
    yearlyCount,
    monthlyRecurringCents,
  };
}

function parseEngagement(value: unknown): AdminDashboardEngagement {
  if (!isRecord(value)) throw new ContractError('KPIs de uso inválidos.');
  const activeAlerts = readInteger(value.activeAlerts);
  const pushDevices = readInteger(value.pushDevices);
  const favorites = readInteger(value.favorites);
  const enabledSpots = readInteger(value.enabledSpots);
  const activeReports = readInteger(value.activeReports);
  const reportsLast7Days = readInteger(value.reportsLast7Days);
  const reportsLast30Days = readInteger(value.reportsLast30Days);
  if (
    activeAlerts === null ||
    pushDevices === null ||
    favorites === null ||
    enabledSpots === null ||
    activeReports === null ||
    reportsLast7Days === null ||
    reportsLast30Days === null
  ) {
    throw new ContractError('KPIs de uso incompletos.');
  }
  return {
    activeAlerts,
    pushDevices,
    favorites,
    enabledSpots,
    activeReports,
    reportsLast7Days,
    reportsLast30Days,
  };
}

function parsePartners(value: unknown): AdminDashboardPartners {
  if (!isRecord(value)) throw new ContractError('KPIs de parceiros inválidos.');
  const published = readInteger(value.published);
  const unpublished = readInteger(value.unpublished);
  const featured = readInteger(value.featured);
  if (published === null || unpublished === null || featured === null) {
    throw new ContractError('KPIs de parceiros incompletos.');
  }
  return { published, unpublished, featured };
}

export function parseAdminDashboard(value: unknown): AdminDashboardSnapshot {
  if (!isRecord(value)) throw new ContractError('Dashboard admin inválido.');
  const generatedAt = readString(value.generatedAt);
  if (!generatedAt) throw new ContractError('Dashboard admin incompleto.');
  return {
    generatedAt,
    users: parseUsers(value.users),
    spots: parseSpots(value.spots),
    billing: parseBilling(value.billing),
    engagement: parseEngagement(value.engagement),
    partners: parsePartners(value.partners),
  };
}
