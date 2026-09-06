export interface PlaceSuggestion {
  name: string;
  formatted: string;
  city: string;
  state: string;
  category: string | null;
  latitude: number;
  longitude: number;
}
