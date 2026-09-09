import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, RefreshCw } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/design-system/components/Button';
import { getLocations } from '@/features/locations/services/locationsService';
import { PageHeader } from '@/pages/shared/PageHeader';
import { ApiError } from '@/shared/api/errors';
import { runAdminAudit } from '@/features/admin-audit/services/adminAuditService';
import type {
  AdminAuditHour,
  AdminAuditResult,
  AdminAuditSources,
} from '@/features/admin-audit/types/adminAudit';
import { routes } from '@/shared/constants/routes';
import pageStyles from '@/pages/shared/pages.module.css';
import styles from './adminAudit.module.css';

function calendarDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(1).replace('.', ',')} KB`;
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Não foi possível executar a auditoria.';
}

function formatNumber(value: number | null, digits = 1) {
  if (value === null) return '—';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function weatherSummary(sources: AdminAuditSources) {
  const weather = sources.weather;
  return (
    <>
      <span>
        Weather: vento {formatNumber(weather.windSpeedKmh)} km/h · rajada{' '}
        {formatNumber(weather.windGustKmh)} km/h · chuva {formatNumber(weather.precipitationMm)} mm
        ({formatNumber(weather.rainProbability, 0)}%) · ar {formatNumber(weather.airTemperatureC)}{' '}
        °C · pressão {formatNumber(weather.pressureHpa, 0)} hPa
      </span>
    </>
  );
}

function AuditDataTables({ hours }: { hours: AdminAuditHour[] }) {
  const hasSources = hours.some((hour) => hour.sources !== null);
  return (
    <section className={styles.dataSection} aria-labelledby="audit-data-title">
      <div>
        <h2 id="audit-data-title">Dados analisados</h2>
        <p className={styles.sectionHint}>
          Estes são os valores por horário usados na auditoria. “Normalizado” representa o dado que
          o TáNoMar usou no forecast.
        </p>
      </div>
      <div className={styles.dataTableWrap}>
        <table className={styles.dataTable}>
          <caption>Dados normalizados pelo TáNoMar</caption>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Nota</th>
              <th>Vento</th>
              <th>Chuva</th>
              <th>Temperaturas</th>
              <th>Ondas / swell</th>
              <th>Pressão</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr key={hour.time} className={hour.isBestHour ? styles.bestHourRow : undefined}>
                <th scope="row">
                  {hour.time}
                  {hour.isBestHour ? <small>Melhor horário</small> : null}
                </th>
                <td>{formatNumber(hour.normalized.score)}</td>
                <td>
                  {formatNumber(hour.normalized.windSpeedKmh)} km/h
                  <small>
                    {hour.normalized.windDirection} · rajada{' '}
                    {formatNumber(hour.normalized.windGustKmh)} km/h
                  </small>
                </td>
                <td>
                  {formatNumber(hour.normalized.rainMm)} mm
                  <small>
                    {hour.normalized.rainProbability}% · Weather{' '}
                    {hour.normalized.rainProbabilityBestMatch}% · GFS{' '}
                    {hour.normalized.rainProbabilityGfs}%
                  </small>
                </td>
                <td>
                  Ar {formatNumber(hour.normalized.airTemperatureC)} °C
                  <small>Água {formatNumber(hour.normalized.waterTemperatureC)} °C</small>
                </td>
                <td>
                  {formatNumber(hour.normalized.waveMeters, 2)} m /{' '}
                  {formatNumber(hour.normalized.wavePeriodSeconds)} s
                  <small>
                    {hour.normalized.waveDirection} · swell{' '}
                    {formatNumber(hour.normalized.swellMeters, 2)} m /{' '}
                    {formatNumber(hour.normalized.swellPeriodSeconds)} s
                  </small>
                </td>
                <td>
                  {formatNumber(hour.normalized.pressureHpa, 0)} hPa
                  <small>Nível do mar {formatNumber(hour.normalized.seaLevelHeightMsl, 2)} m</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasSources ? (
        <div className={styles.dataTableWrap}>
          <table className={styles.dataTable}>
            <caption>Valores recebidos das fontes para comparação</caption>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Weather</th>
                <th>GFS</th>
                <th>Marine</th>
                <th>Nota recalculada</th>
              </tr>
            </thead>
            <tbody>
              {hours.map((hour) => (
                <tr key={`${hour.time}-sources`}>
                  <th scope="row">{hour.time}</th>
                  <td>
                    {hour.sources ? weatherSummary(hour.sources) : 'Horário ausente na fonte'}
                  </td>
                  <td>
                    {hour.sources
                      ? `${formatNumber(hour.sources.gfsRain.precipitationMm)} mm · ${formatNumber(hour.sources.gfsRain.rainProbability, 0)}%`
                      : '—'}
                  </td>
                  <td>
                    {hour.sources
                      ? `${formatNumber(hour.sources.marine.waveMeters, 2)} m / ${formatNumber(hour.sources.marine.wavePeriodSeconds)} s · água ${formatNumber(hour.sources.marine.waterTemperatureC)} °C`
                      : '—'}
                  </td>
                  <td>{hour.sources ? formatNumber(hour.sources.calculatedScore) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function AuditResult({ result }: { result: AdminAuditResult }) {
  const { audit } = result;
  const errors = audit.findings.filter((finding) => finding.severity === 'error').length;
  const warnings = audit.findings.filter((finding) => finding.severity === 'warning').length;
  const StatusIcon = audit.passed ? CheckCircle2 : AlertTriangle;

  return (
    <section className={styles.result} aria-labelledby="audit-result-title">
      <div
        className={`${styles.status} ${audit.passed ? styles.statusPassed : styles.statusFailed}`}
      >
        <StatusIcon size={22} aria-hidden="true" />
        <div>
          <h2 id="audit-result-title">
            {audit.passed ? 'Auditoria aprovada' : 'Atenção necessária'}
          </h2>
          <p>
            {audit.hourCount} horas analisadas · {audit.bestHourCount} melhores horários · {errors}{' '}
            erros · {warnings} avisos
          </p>
        </div>
      </div>

      <div className={styles.meta}>
        <span>
          {result.sourceRefresh ? 'Fontes atualizadas agora' : 'Forecast armazenado auditado'}
        </span>
        <span>
          {audit.rawSourceComparisonAvailable
            ? 'Comparação com Weather, GFS e Marine disponível'
            : 'Comparação com fontes externas não executada'}
        </span>
        {result.snapshot ? (
          <span>
            Snapshot: {formatDate(result.snapshot.createdAt)} ·{' '}
            {formatBytes(result.snapshot.payloadSize)}
          </span>
        ) : null}
      </div>

      <div className={styles.findings}>
        <h3>Achados</h3>
        {audit.findings.length === 0 ? (
          <p className={styles.empty}>Nenhuma inconsistência encontrada nos dados auditados.</p>
        ) : (
          <ul>
            {audit.findings.map((finding, index) => (
              <li
                key={`${finding.path}-${index}`}
                className={
                  finding.severity === 'error' ? styles.findingError : styles.findingWarning
                }
              >
                <strong>{finding.severity === 'error' ? 'Erro' : 'Aviso'}</strong>
                <div>
                  <code>{finding.path}</code>
                  <p>{finding.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function AdminAuditPage() {
  const today = calendarDate();
  const [spotId, setSpotId] = useState('');
  const [date, setDate] = useState(today);
  const [refreshSources, setRefreshSources] = useState(true);
  const locations = useQuery({
    queryKey: ['admin-audit-locations'],
    queryFn: getLocations,
  });
  const locationOptions = [...(locations.data ?? [])].sort((left, right) =>
    left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' }),
  );
  const audit = useMutation({ mutationFn: runAdminAudit });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedSpotId = spotId.trim();
    if (!normalizedSpotId || !date) return;
    audit.mutate({ spotId: normalizedSpotId, date, refreshSources });
  }

  return (
    <div className={pageStyles.page}>
      <Link className={pageStyles.backLink} to={routes.admin}>
        <ArrowLeft size={16} aria-hidden="true" />
        Administração
      </Link>
      <PageHeader
        eyebrow="Auditoria de dados"
        title="Confira a previsão antes de confiar nela."
        description="Valide horários, notas, condições e a consistência entre o forecast normalizado e as fontes meteorológicas."
      />

      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field} htmlFor="audit-spot">
          <span>Local</span>
          <select
            id="audit-spot"
            value={spotId}
            onChange={(event) => setSpotId(event.target.value)}
            disabled={locations.isPending}
            required
          >
            <option value="">
              {locations.isPending ? 'Carregando locais…' : 'Escolha um local'}
            </option>
            {locationOptions.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field} htmlFor="audit-date">
          <span>Data</span>
          <input
            id="audit-date"
            type="date"
            value={date}
            min={today}
            max={addDays(today, 7)}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </label>
        <label className={styles.choice}>
          <input
            type="checkbox"
            checked={refreshSources}
            onChange={(event) => setRefreshSources(event.target.checked)}
          />
          <span>
            Atualizar fontes agora
            <small>
              Consulta Weather, GFS e Marine novamente. A auditoria não grava nem altera o forecast.
            </small>
          </span>
        </label>
        <div className={styles.actions}>
          <Button type="submit" disabled={audit.isPending || !spotId.trim() || !date}>
            {audit.isPending ? (
              <RefreshCw className={styles.spin} size={17} aria-hidden="true" />
            ) : (
              <ClipboardCheck size={17} aria-hidden="true" />
            )}
            {audit.isPending ? 'Auditando…' : 'Executar auditoria'}
          </Button>
        </div>
      </form>

      {audit.isError ? <p className={styles.error}>{errorMessage(audit.error)}</p> : null}
      {audit.data ? (
        <>
          <AuditResult result={audit.data} />
          <AuditDataTables hours={audit.data.audit.hours} />
        </>
      ) : null}
    </div>
  );
}
