export interface ForecastAlert {
  id: string;
  spotId: string;
  spotName: string;
  minimumScore: number;
  leadHours: number;
  targetHour: number | null;
  isActive: boolean;
  lastNotifiedDate: string | null;
  createdAt: string;
  updatedAt: string;
}
