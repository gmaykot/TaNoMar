export interface ForecastAlert {
  id: string;
  spotId: string;
  spotName: string;
  minimumScore: number;
  leadHours: number;
  isActive: boolean;
  lastNotifiedDate: string | null;
  createdAt: string;
  updatedAt: string;
}
