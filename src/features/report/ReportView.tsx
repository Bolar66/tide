import { useMemo, useState } from 'react';
import { BRAND } from '../../brand';
import { IconChevronLeft } from '../../components/icons';
import { Segmented } from '../../components/Segmented';
import { Switch } from '../../components/Switch';
import { buildReport, type ReportMetricId } from '../../domain/report';
import { useCycle } from '../../hooks/useCycle';
import { useI18n } from '../../i18n';
import { useTide } from '../../store/context';
import './report.css';

const fi1 = (n: number | null) =>
  n === null ? '–' : new Intl.NumberFormat('fi-FI', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

/** A clean summary for a doctor's visit. Printing (or "Save as PDF") prints only the paper. */
export function ReportView({ onBack }: { onBack: () => void }) {
  const { t, f } = useI18n();
  const r = t.report;
  const days = useTide((s) => s.days);
  const { periods, today } = useCycle();
  const [months, setMonths] = useState<'3' | '6' | '12'>('6');
  const [includeMedication, setIncludeMedication] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const report = useMemo(
    () => buildReport(periods, days, today, { months: Number(months), includeMedication, includeNotes }),
    [periods, days, today, months, includeMedication, includeNotes],
  );

  const label = (id: ReportMetricId) => (id in t.symptoms ? t.symptoms[id as keyof typeof t.symptoms].label : (t.trackers.items[id]?.label ?? id));
  const s = report.summary;
  const showPainkillers = report.cycles.some((c) => c.painkillerDays > 0);

  return (
    <div className="stack stack--lg report">
      <header className="about-nav report__controls">
        <button type="button" className="icon-button icon-button--filled" onClick={onBack} aria-label={t.common.back}>
          <IconChevronLeft />
        </button>
      </header>
      <header className="page-header report__controls">
        <div>
          <h1 className="display">{r.title}</h1>
          <p className="page-header__sub muted">{r.intro}</p>
        </div>
      </header>

      <section className="card stack report__controls">
        <Segmented
          label={r.range}
          options={(['3', '6', '12'] as const).map((value) => ({ value, label: r.months(Number(value)) }))}
          value={months}
          onChange={setMonths}
        />
        <ul className="list">
          <li>
            <Switch label={r.includeMedication} hint={r.includeMedicationHint} checked={includeMedication} onChange={setIncludeMedication} />
          </li>
          <li>
            <Switch label={r.includeNotes} hint={r.includeNotesHint} checked={includeNotes} onChange={setIncludeNotes} />
          </li>
        </ul>
        <button type="button" className="button" onClick={() => window.print()}>
          {r.print}
        </button>
        <p className="muted small">{r.printHint}</p>
      </section>

      <article className="report-paper" aria-label={r.paperTitle}>
        <header className="report-paper__head">
          <div>
            <h2 className="report-paper__title">{r.paperTitle}</h2>
            <p className="report-paper__meta">
              {r.period(f.fullDate(report.from), f.fullDate(report.to))} · {r.created(f.fullDate(today))}
            </p>
          </div>
          <span className="report-paper__brand">{BRAND.name}</span>
        </header>

        <dl className="report-summary">
          <div>
            <dt>{r.summary.cycles}</dt>
            <dd>{s.cycles}</dd>
          </div>
          <div>
            <dt>{r.summary.avgCycle}</dt>
            <dd>
              {s.avgCycle === null ? '–' : `${fi1(s.avgCycle)} ${r.days}`}
              {s.minCycle !== null && s.maxCycle !== null && <small>{r.rangeOf(s.minCycle, s.maxCycle)}</small>}
            </dd>
          </div>
          <div>
            <dt>{r.summary.avgPeriod}</dt>
            <dd>{s.avgPeriod === null ? '–' : `${fi1(s.avgPeriod)} ${r.days}`}</dd>
          </div>
          <div>
            <dt>{r.summary.logged}</dt>
            <dd>{s.loggedDays}</dd>
          </div>
        </dl>

        <h3 className="report-paper__h">{r.cyclesTitle}</h3>
        {report.cycles.length === 0 ? (
          <p>{r.noCycles}</p>
        ) : (
          <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>{r.cols.start}</th>
                <th>{r.cols.length}</th>
                <th>{r.cols.period}</th>
                <th>{r.cols.flow}</th>
                <th>{r.cols.cramps}</th>
                {showPainkillers && <th>{r.cols.painkillers}</th>}
              </tr>
            </thead>
            <tbody>
              {report.cycles.map((c) => (
                <tr key={c.start}>
                  <td>{f.fullDate(c.start)}</td>
                  <td>{c.length === null ? r.ongoing : `${c.length} ${r.days}`}</td>
                  <td>{`${c.periodLength} ${r.days}`}</td>
                  <td>
                    {c.heaviestFlow ? t.day.flowLevels[c.heaviestFlow] : '–'}
                    {c.heavyDays > 0 && <small> · {r.heavyDays(c.heavyDays)}</small>}
                  </td>
                  <td>{fi1(c.cramps)}</td>
                  {showPainkillers && <td>{c.painkillerDays || '–'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        <h3 className="report-paper__h">{r.symptomsTitle}</h3>
        {report.metrics.length === 0 ? (
          <p>{r.noSymptoms}</p>
        ) : (
          <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>{r.cols.symptom}</th>
                <th>{r.cols.days}</th>
                <th>{r.cols.mean}</th>
                <th>{r.cols.strong}</th>
                <th>{r.cols.inPeriod}</th>
                <th>{r.cols.other}</th>
              </tr>
            </thead>
            <tbody>
              {report.metrics.map((m) => (
                <tr key={m.id}>
                  <td>{label(m.id)}</td>
                  <td>{m.days}</td>
                  <td>{fi1(m.mean)}</td>
                  <td>{m.strongDays}</td>
                  <td>{fi1(m.periodMean)}</td>
                  <td>{fi1(m.otherMean)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        {report.metrics.length > 0 && <p className="report-paper__note">{r.scaleNote}</p>}

        {report.medication && (
          <>
            <h3 className="report-paper__h">{r.medicationTitle}</h3>
            <p>{r.medicationSummary(report.medication.painkillerDays, report.medication.pillDays)}</p>
            {report.medication.notes.length > 0 && (
              <ul className="report-notes">
                {report.medication.notes.map((n) => (
                  <li key={n.date}>
                    <strong>{f.fullDate(n.date)}</strong> {n.text}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {report.notes && (
          <>
            <h3 className="report-paper__h">{r.notesTitle}</h3>
            {report.notes.length === 0 ? (
              <p>{r.noNotes}</p>
            ) : (
              <ul className="report-notes">
                {report.notes.map((n) => (
                  <li key={n.date}>
                    <strong>{f.fullDate(n.date)}</strong> {n.text}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <p className="report-paper__footer">{r.disclaimer}</p>
      </article>
    </div>
  );
}
