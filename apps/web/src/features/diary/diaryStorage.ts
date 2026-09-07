export interface DiaryEntry {
  id: string;
  spotId: string;
  spotName: string;
  date: string;
  species: string;
  bait: string;
  result: 'captura' | 'sem-captura';
  notes: string;
  createdAt: string;
}

const entriesKey = 'tanomar.diary.v1';
const tripPlanKey = 'tanomar.trip-plan.v1';

export interface TripPlan {
  id: string;
  spotId: string;
  spotName: string;
  date: string;
  time: string;
  notes: string;
  createdAt: string;
}

type TripPlanInput = Omit<TripPlan, 'id' | 'createdAt'>;

export function readDiaryEntries(): DiaryEntry[] {
  try {
    const value = JSON.parse(localStorage.getItem(entriesKey) ?? '[]') as unknown;
    return Array.isArray(value) ? (value as DiaryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveDiaryEntry(entry: Omit<DiaryEntry, 'id' | 'createdAt'>) {
  const next = [
    { ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
    ...readDiaryEntries(),
  ];
  localStorage.setItem(entriesKey, JSON.stringify(next));
  return next;
}

export function removeDiaryEntry(id: string) {
  const next = readDiaryEntries().filter((entry) => entry.id !== id);
  localStorage.setItem(entriesKey, JSON.stringify(next));
  return next;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalizeTripPlan(value: unknown): TripPlan | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const spotId = readString(record.spotId);
  const spotName = readString(record.spotName);
  const date = readString(record.date);
  if (!spotId || !spotName || !date) return null;
  return {
    id: readString(record.id) || crypto.randomUUID(),
    spotId,
    spotName,
    date,
    time: readString(record.time),
    notes: readString(record.notes),
    createdAt: readString(record.createdAt) || new Date().toISOString(),
  };
}

export function readTripPlans(): TripPlan[] {
  try {
    const value = JSON.parse(localStorage.getItem(tripPlanKey) ?? '[]') as unknown;
    if (Array.isArray(value)) return value.flatMap((item) => normalizeTripPlan(item) ?? []);
    const plan = normalizeTripPlan(value);
    return plan ? [plan] : [];
  } catch {
    return [];
  }
}

export function readTripPlan(): TripPlan | null {
  return readTripPlans()[0] ?? null;
}

export function saveTripPlan(plan: TripPlanInput) {
  const next = [
    { ...plan, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
    ...readTripPlans().filter((item) => item.spotId !== plan.spotId || item.date !== plan.date),
  ];
  localStorage.setItem(tripPlanKey, JSON.stringify(next));
  return next;
}

export function updateTripPlan(id: string, plan: Pick<TripPlan, 'date' | 'time' | 'notes'>) {
  const next = readTripPlans().map((item) => (item.id === id ? { ...item, ...plan } : item));
  localStorage.setItem(tripPlanKey, JSON.stringify(next));
  return next;
}

export function removeTripPlan(id: string) {
  const next = readTripPlans().filter((plan) => plan.id !== id);
  localStorage.setItem(tripPlanKey, JSON.stringify(next));
  return next;
}
