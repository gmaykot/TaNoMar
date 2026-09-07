import type { FormEvent } from 'react';
import { useState } from 'react';
import { ArrowLeft, BookOpen, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import {
  readDiaryEntries,
  removeDiaryEntry,
  saveDiaryEntry,
  type DiaryEntry,
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
