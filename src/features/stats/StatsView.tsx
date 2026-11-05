import { useState, type CSSProperties, type ReactNode } from 'react';
import { IconPlus } from '../../components/icons';
import { getCycles, periodLength } from '../../domain/prediction';
import type { Period } from '../../domain/types';
import { useCycle } from '../../hooks/useCycle';
import { useI18n } from '../../i18n';
import { PeriodSheet } from './PeriodSheet';
import { PhaseComparison } from './PhaseComparison';
import './stats.css';

/** Cycles within this many days of each other count as regular (common clinical rule of thumb). */
const REGULAR_RANGE = 7;

export function StatsView({ above }: { above?: ReactNode } = {}) {
  const { t, f } = useI18n();
  const { today, periods, stats, hasHints, cycleDay } = useCycle();
  const [editing, setEditing] = useState<Period | 'new' | null>(null);

  const cycleByStart = new Map(getCycles(periods).map((c) => [c.start, c]));
  const history = [...periods].reverse();
  const longest = Math.max(stats.avgCycle, ...[...cycleByStart.values()].map((c) => c.length), cycleDay ?? 0);
  const scale = (n: number) => `${Math.min(100, (n / longest) * 100)}%`;
  const fallbackNote = hasHints ? t.stats.hints : t.stats.defaults;
  const regularity =
    stats.min !== null && stats.max !== null && stats.cycleCount >= 3
      ? stats.max - stats.min <= REGULAR_RANGE
        ? t.stats.regular
        : t.stats.irregular
      : null;

  return (
    <div className="stack stack--lg">
      <header className="page-header">
        <h1 className="display">{t.stats.title}</h1>
      </header>
      {above}

      <section className="card stats-hero enter">
        <span className="eyebrow">{t.stats.avgCycle}</span>
        <p className="stats-hero__value display tabular">
          {stats.avgCycle}
          <span className="stats-hero__unit">{t.stats.daysUnit}</span>
        </p>
        <div className="stats-hero__meta">
          {regularity && <span className="pill">{regularity}</span>}
          <span className="muted small">{stats.usingDefaultCycle ? fallbackNote : t.stats.basis(stats.cycleCount)}</span>
        </div>
      </section>

      <div className="stat-grid">
        <Stat
          i={1}
          label={t.stats.avgPeriod}
          value={`${stats.avgPeriod}`}
          unit={t.stats.daysUnit}
          note={stats.usingDefaultPeriod ? fallbackNote : undefined}
        />
        <Stat
          i={2}
          label={t.stats.variation}
          value={stats.sd !== null ? t.stats.sd(stats.sd) : '–'}
          unit={stats.sd !== null ? t.stats.daysUnit : ''}
          note={stats.min !== null && stats.max !== null ? t.stats.range(stats.min, stats.max) : undefined}
        />
      </div>

      <section className="card enter" style={{ '--i': 3 } as CSSProperties}>
        <h2 className="card__title">{t.stats.history}</h2>

        {history.length === 0 ? (
          <div className="stats-empty">
            <svg viewBox="0 0 120 48" className="stats-empty__art" aria-hidden>
              <path d="M4 30c9-10 19-10 28 0s19 10 28 0 19-10 28 0 19 10 28 0" />
              <path d="M18 40c7-7 14-7 21 0s14 7 21 0 14-7 21 0 14 7 21 0" opacity="0.5" />
            </svg>
            <p className="stats-empty__title display">{t.stats.emptyTitle}</p>
            <p className="muted">{t.stats.empty}</p>
          </div>
        ) : (
          <ol className="cycle-chart" style={{ '--avg': scale(stats.avgCycle) } as CSSProperties}>
            {history.map((p, index) => {
              const cycle = cycleByStart.get(p.start);
              const isCurrent = index === 0 && !cycle && cycleDay !== null && p.start <= today;
              const length = cycle?.length ?? (isCurrent ? cycleDay : null);
              const len = periodLength(p);
              return (
                <li key={p.id}>
                  <button type="button" className="cycle-chart__row" onClick={() => setEditing(p)}>
                    <span className="cycle-chart__label">
                      <span className="cycle-chart__dates tabular">
                        {f.shortDate(p.start)}–{p.end ? f.shortDate(p.end) : t.stats.ongoing}
                      </span>
                      <span className="cycle-chart__sub">
                        {isCurrent ? t.stats.currentCycle : len !== undefined ? t.stats.periodLength(len) : ''}
                        {cycle && !cycle.valid && ` · ${t.stats.outlier}`}
                      </span>
                    </span>
                    <span className="cycle-chart__track">
                      {isCurrent && <span className="cycle-chart__expected" style={{ width: scale(stats.avgCycle) }} />}
                      {length !== null && (
                        <span
                          className={`cycle-chart__bar${cycle && !cycle.valid ? ' cycle-chart__bar--outlier' : ''}`}
                          style={{ width: scale(length) }}
                        />
                      )}
                    </span>
                    <span className="cycle-chart__value tabular">{length !== null ? t.stats.cycleLength(length) : ''}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        <button type="button" className="button button--secondary stats-add" onClick={() => setEditing('new')}>
          <IconPlus width={20} height={20} />
          {t.stats.addPast}
        </button>
      </section>

      <PhaseComparison />

      <PeriodSheet
        key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id}
        target={editing}
        today={today}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function Stat({ label, value, unit, note, i }: { label: string; value: string; unit: string; note?: string; i: number }) {
  return (
    <div className="stat enter" style={{ '--i': i } as CSSProperties}>
      <span className="stat__label">{label}</span>
      <span className="stat__value display tabular">
        {value}
        {unit && <span className="stat__unit">{unit}</span>}
      </span>
      {note && <span className="stat__note">{note}</span>}
    </div>
  );
}
