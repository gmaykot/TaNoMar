import { beforeEach, describe, expect, it } from 'vitest';
import {
  consumeTripPlan,
  findTripPlan,
  readTripPlan,
  readTripPlans,
  removeTripPlan,
  saveTripPlan,
  updateTripPlan,
} from './diaryStorage';

describe('diaryStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('salva várias saídas planejadas e atualiza a mesma data do mesmo local', () => {
    saveTripPlan({
      spotId: 'pantano_do_sul',
      spotName: 'Pântano do Sul',
      date: '2026-09-06',
      time: '16:30–19:00',
      notes: '',
    });
    saveTripPlan({
      spotId: 'acores',
      spotName: 'Açores',
      date: '2026-09-07',
      time: '05:30–08:00',
      notes: '',
    });
    saveTripPlan({
      spotId: 'pantano_do_sul',
      spotName: 'Pântano do Sul',
      date: '2026-09-06',
      time: '17:00',
      notes: 'Levar camarão',
    });

    const plans = readTripPlans();

    expect(plans).toHaveLength(2);
    expect(plans[0]).toMatchObject({
      spotId: 'pantano_do_sul',
      date: '2026-09-06',
      time: '17:00',
      notes: 'Levar camarão',
    });
    expect(readTripPlan()).toEqual(plans[0]);
  });

  it('edita e remove uma saída planejada', () => {
    const [plan] = saveTripPlan({
      spotId: 'pantano_do_sul',
      spotName: 'Pântano do Sul',
      date: '2026-09-06',
      time: '16:30–19:00',
      notes: '',
    });

    updateTripPlan(plan.id, {
      date: '2026-09-07',
      time: '06:00',
      notes: 'Checar maré',
    });

    expect(readTripPlans()[0]).toMatchObject({
      date: '2026-09-07',
      time: '06:00',
      notes: 'Checar maré',
    });
    expect(removeTripPlan(plan.id)).toEqual([]);
  });

  it('encontra e consome o planejamento pelo id ou pelo local e data', () => {
    const [first] = saveTripPlan({
      spotId: 'pantano_do_sul',
      spotName: 'Pântano do Sul',
      date: '2026-09-06',
      time: '16:30–19:00',
      notes: '',
    });
    saveTripPlan({
      spotId: 'acores',
      spotName: 'Açores',
      date: '2026-09-07',
      time: '05:30–08:00',
      notes: '',
    });

    expect(findTripPlan('pantano_do_sul', '2026-09-06')?.id).toBe(first.id);
    expect(consumeTripPlan({ id: first.id, spotId: 'pantano_do_sul', date: '2026-09-06' })).toEqual([
      expect.objectContaining({ spotId: 'acores' }),
    ]);
    expect(
      consumeTripPlan({ spotId: 'acores', date: '2026-09-07' }),
    ).toEqual([]);
  });

  it('lê o planejamento antigo salvo como objeto único', () => {
    localStorage.setItem(
      'tanomar.trip-plan.v1',
      JSON.stringify({
        spotId: 'pantano_do_sul',
        spotName: 'Pântano do Sul',
        date: '2026-09-06',
      }),
    );

    expect(readTripPlans()[0]).toMatchObject({
      spotId: 'pantano_do_sul',
      spotName: 'Pântano do Sul',
      date: '2026-09-06',
      time: '',
      notes: '',
    });
  });
});
