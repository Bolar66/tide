import { useState } from 'react';
import { getCycles, periodLength } from '../../domain/prediction';
import type { Period } from '../../domain/types';
import { useCycle } from '../../hooks/useCycle';
import { days, fullDate, shortDate, t } from '../../i18n/fi';
import { PeriodSheet } from './PeriodSheet';
import './stats.css';

export function StatsView() {
  const { today, periods, stats } = useCycle();
  const [editing, setEditing] = useState<Period | 'new' | null>(null);

  const cycleByStart = new Map(getCycles(periods).map((c) => [c.start, c]));
  const history = [...periods].reverse();

  return (
    <div className="stack">
      <header className="page-header">
        <h1>{t.stats.title}</h1>
      </header>

      <div className="stat-grid">
        <Stat label={t.stats.avgCycle} value={days(stats.avgCycle)} note={stats.usingDefaultCycle ? t.stats.defaults : undefined} />
        <Stat label={t.stats.avgPeriod} value={days(stats.avgPeriod)} note={stats.usingDefaultPeriod ? t.stats.defaults : undefined} />
        <Stat
          label={t.stats.variation}
          value={stats.sd !== null ? t.stats.sd(stats.sd) : '–'}
          note={stats.min !== null && stats.max !== null ? t.stats.range(stats.min, stats.max) : undefined}
        />
        <Stat label={t.stats.cycles} value={String(stats.cycleCount)} />
      </div>
      {stats.cycleCount > 0 && <p className="muted">{t.stats.basis(stats.cycleCount)}</p>}

      <section className="card">
        <h2>{t.stats.history}</h2>
        {history.length === 0 ? (
          <p className="muted">{t.stats.empty}</p>
        ) : (
          <ul className="history">
            {history.map((p) => {
              const cycle = cycleByStart.get(p.start);
              const len = periodLength(p);
              return (
                <li key={p.id}>
                  <button type="button" className="history__row" onClick={() => setEditing(p)}>
                    <span className="history__dates">
                      {shortDate(p.start)}–{p.end ? fullDate(p.end) : t.stats.ongoing}
                    </span>
                    <span className="history__meta">
                      {len !== undefined && days(len)}
                      {cycle && (
                        <>
                          {' · '}
                          {t.stats.cycleLength(cycle.length)}
                          {!cycle.valid && <em className="history__outlier"> ({t.stats.outlier})</em>}
                        </>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <button type="button" className="button button--secondary history__add" onClick={() => setEditing('new')}>
          {t.stats.addPast}
        </button>
      </section>

      <PeriodSheet
        key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id}
        target={editing}
        today={today}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
      {note && <span className="stat__note">{note}</span>}
    </div>
  );
}
