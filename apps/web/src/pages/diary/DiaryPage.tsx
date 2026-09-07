import type { FormEvent } from 'react';
import { useState } from 'react';
import { ArrowLeft, BookOpen, CalendarCheck, Pencil, Save, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import {
  readDiaryEntries,
  readTripPlans,
  removeDiaryEntry,
  removeTripPlan,
  saveDiaryEntry,
  updateTripPlan,
  type DiaryEntry,
  type TripPlan,
} from '@/features/diary/diaryStorage';
import { useLocations } from '@/features/locations/hooks/useLocations';
import formStyles from '@/features/locations/components/spotForm.module.css';
import accountStyles from '@/pages/account/account.module.css';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

export function DiaryPage() {
  const locations = useLocations();
  const [entries, setEntries] = useState<DiaryEntry[]>(() => readDiaryEntries());
  const [plans, setPlans] = useState<TripPlan[]>(() => readTripPlans());
  const [editingPlan, setEditingPlan] = useState<TripPlan | null>(null);
  const [spotId, setSpotId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [species, setSpecies] = useState('');
  const [bait, setBait] = useState('');
  const [result, setResult] = useState<DiaryEntry['result']>('captura');
  const [notes, setNotes] = useState('');

  if (locations.isPending)
    return (
      <FeedbackState
        title="Abrindo seu diário"
        description="Carregando os locais cadastrados."
        busy
      />
    );

  function submit(event: FormEvent) {
    event.preventDefault();
    const spot = locations.data?.find((item) => item.id === spotId);
    if (!spot) return;
    setEntries(saveDiaryEntry({ spotId, spotName: spot.name, date, species, bait, result, notes }));
    setSpecies('');
    setBait('');
    setNotes('');
  }

  function fillFromPlan(plan: TripPlan) {
    setSpotId(plan.spotId);
    setDate(plan.date);
    if (plan.notes) setNotes(plan.notes);
  }

  function submitPlanEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingPlan) return;
    setPlans(
      updateTripPlan(editingPlan.id, {
        date: editingPlan.date,
        time: editingPlan.time,
        notes: editingPlan.notes,
      }),
    );
    setEditingPlan(null);
  }

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.account}>
        <ArrowLeft size={16} aria-hidden="true" /> Conta
      </Link>
      <PageHeader
        eyebrow="Memória de pesca"
        title="Seu diário."
        description="Registre capturas e saídas sem captura neste aparelho."
      />
      {plans.length ? (
        <section className={accountStyles.accountSection} aria-labelledby="planned-trips">
          <h2 id="planned-trips">Saídas planejadas</h2>
          {plans.map((plan) => {
            const isEditing = editingPlan?.id === plan.id;
            return (
              <Card as="article" key={plan.id} className={accountStyles.formCard}>
                <div className={accountStyles.formHeader}>
                  <h2>{plan.spotName}</h2>
                  <p>{[plan.date, plan.time].filter(Boolean).join(' · ')}</p>
                </div>
                {isEditing && editingPlan ? (
                  <form className={formStyles.form} onSubmit={submitPlanEdit}>
                    <label className={formStyles.field}>
                      <span>Data</span>
                      <input
                        type="date"
                        value={editingPlan.date}
                        onChange={(event) =>
                          setEditingPlan({ ...editingPlan, date: event.target.value })
                        }
                        required
                      />
                    </label>
                    <label className={formStyles.field}>
                      <span>Horário</span>
                      <input
                        value={editingPlan.time}
                        onChange={(event) =>
                          setEditingPlan({ ...editingPlan, time: event.target.value })
                        }
                        placeholder="Ex.: 05:30–08:00"
                      />
                    </label>
                    <label className={formStyles.field}>
                      <span>Observações</span>
                      <textarea
                        value={editingPlan.notes}
                        onChange={(event) =>
                          setEditingPlan({ ...editingPlan, notes: event.target.value })
                        }
                        maxLength={500}
                        placeholder="O que você quer lembrar antes de sair?"
                      />
                    </label>
                    <div className={formStyles.actions}>
                      <Button type="submit">
                        <Save size={16} aria-hidden="true" /> Salvar planejamento
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditingPlan(null)}
                      >
                        <X size={16} aria-hidden="true" /> Cancelar edição
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    {plan.notes ? <p>{plan.notes}</p> : null}
                    <div className={formStyles.actions}>
                      <Button type="button" variant="secondary" onClick={() => fillFromPlan(plan)}>
                        <CalendarCheck size={16} aria-hidden="true" /> Registrar no diário
                      </Button>
                      <Button type="button" variant="quiet" onClick={() => setEditingPlan(plan)}>
                        <Pencil size={16} aria-hidden="true" /> Editar
                      </Button>
                      <Button
                        type="button"
                        variant="quiet"
                        onClick={() => setPlans(removeTripPlan(plan.id))}
                      >
                        <Trash2 size={16} aria-hidden="true" /> Cancelar saída
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </section>
      ) : null}
      <Card className={accountStyles.formCard}>
        <form className={formStyles.form} onSubmit={submit}>
          <label className={formStyles.field}>
            <span>Local</span>
            <select value={spotId} onChange={(event) => setSpotId(event.target.value)} required>
              <option value="">Escolha um local</option>
              {locations.data?.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className={formStyles.field}>
            <span>Data</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          <label className={formStyles.field}>
            <span>Resultado</span>
            <select
              value={result}
              onChange={(event) => setResult(event.target.value as DiaryEntry['result'])}
            >
              <option value="captura">Teve captura</option>
              <option value="sem-captura">Sem captura</option>
            </select>
          </label>
          <label className={formStyles.field}>
            <span>Espécie</span>
            <input
              value={species}
              onChange={(event) => setSpecies(event.target.value)}
              placeholder="Ex.: tainha"
            />
          </label>
          <label className={formStyles.field}>
            <span>Isca</span>
            <input
              value={bait}
              onChange={(event) => setBait(event.target.value)}
              placeholder="Ex.: camarão"
            />
          </label>
          <label className={formStyles.field}>
            <span>Observações</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={500}
              placeholder="O que vale lembrar desta saída?"
            />
          </label>
          <Button type="submit">
            <BookOpen size={16} aria-hidden="true" /> Salvar no diário
          </Button>
        </form>
      </Card>
      {entries.length ? (
        entries.map((entry) => (
          <Card as="article" key={entry.id} className={accountStyles.formCard}>
            <div className={accountStyles.formHeader}>
              <h2>{entry.spotName}</h2>
              <p>
                {entry.date} · {entry.result === 'captura' ? 'Teve captura' : 'Sem captura'}
              </p>
            </div>
            {entry.species || entry.bait ? (
              <p>{[entry.species, entry.bait].filter(Boolean).join(' · ')}</p>
            ) : null}
            {entry.notes ? <p>{entry.notes}</p> : null}
            <Button
              type="button"
              variant="quiet"
              onClick={() => setEntries(removeDiaryEntry(entry.id))}
            >
              <Trash2 size={16} aria-hidden="true" /> Apagar
            </Button>
          </Card>
        ))
      ) : (
        <FeedbackState
          title="Seu diário está vazio"
          description="Registre a próxima saída para começar a criar seu histórico."
        />
      )}
    </div>
  );
}
