import { describe, expect, it } from 'vitest';
import { landingPreviewRanking } from './landingPreviewData';

describe('landingPreviewData', () => {
  it('reusa os locais ilustrativos da Grande Florianópolis', () => {
    expect(landingPreviewRanking.map((item) => item.locationName)).toEqual([
      'Pântano do Sul',
      'Joaquina',
      'Armação',
      'Campeche',
    ]);
  });
});
