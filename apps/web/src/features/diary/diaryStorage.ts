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
  spotId: string;
  spotName: string;
  date: string;
}

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

export function readTripPlan(): TripPlan | null {
  try {
    const value = JSON.parse(localStorage.getItem(tripPlanKey) ?? 'null') as unknown;
    return typeof value === 'object' && value !== null ? (value as TripPlan) : null;
  } catch {
    return null;
  }
}

export function saveTripPlan(plan: TripPlan) {
  localStorage.setItem(tripPlanKey, JSON.stringify(plan));
}
