import { useMemo, type CSSProperties } from 'react';
import { IconSparkle } from '../../components/icons';
import { diffDays } from '../../domain/dates';
import { INSIGHT_TARGET_DAYS, insightDataDays, insightsForPhase, PRE_PERIOD_DAYS, prePeriodInsights, type CycleInsight } from '../../domain/insights';
import { phaseAverages } from '../../domain/phaseStats';
import { useCycle } from '../../hooks/useCycle';
import { useI18n } from '../../i18n';
import { useTide } from '../../store/context';

const fi1 = (n: number) => new Intl.NumberFormat('fi-FI', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

/**
 * "Sinun kiertosi": what the user's own logs say about the current phase and the days before a
 * period. Until there is enough data it shows how close the first insights are.
 */
export function InsightCard() {
  const { t } = useI18n();
  const it = t.insights;
  const days = useTide((s) => s.days);
  const { periods, stats, today, phase, prediction } = useCycle();

  const table = useMemo(() => phaseAverages(periods, days, stats, today), [periods, days, stats, today]);
  const pre = useMemo(() => prePeriodInsights(periods, days, today), [periods, days, today]);
  const logged = useMemo(() => insightDataDays(days, today), [days, today]);

  const compared = phase === 'late' ? 'luteal' : phase;
  const now = compared ? insightsForPhase(table, compared) : [];
  const next = prediction.upcoming[0];
  const daysToPeriod = next ? diffDays(next.start, today) : null;
  const showPre = pre.length > 0 && daysToPeriod !== null && daysToPeriod >= 0 && daysToPeriod <= PRE_PERIOD_DAYS + 2;

  if (periods.length === 0) return null;

  const rows = (list: CycleInsight[]) => (
    <ul className="insight-list">
      {list.map((i) => {
        const max = i.metric === 'sleepHours' ? Math.max(9, i.mean, i.otherMean) : 5;
        return (
          <li key={i.metric} className="cycle-insight">
            <p className="cycle-insight__text">{it.line(t.phaseView.metrics[i.metric], i.direction, i.metric === 'sleepHours')}</p>
            <div className="cycle-insight__bars" aria-hidden>
              <span className="cycle-insight__bar cycle-insight__bar--now" style={{ '--w': `${(i.mean / max) * 100}%` } as CSSProperties} />
              <span className="cycle-insight__value tabular">{fi1(i.mean)}</span>
              <span className="cycle-insight__bar cycle-insight__bar--other" style={{ '--w': `${(i.otherMean / max) * 100}%` } as CSSProperties} />
              <span className="cycle-insight__value cycle-insight__value--other tabular">{fi1(i.otherMean)}</span>
            </div>
            <p className="visually-hidden">{it.srValues(fi1(i.mean), fi1(i.otherMean))}</p>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className="card insight-card">
      <p className="eyebrow insight-card__eyebrow">
        <IconSparkle width={16} height={16} aria-hidden /> {it.eyebrow}
      </p>
      {showPre ? (
        <>
          <h2 className="card__title">{it.preTitle}</h2>
          {rows(pre)}
          <p className="insight-card__legend muted small">{it.legendPre}</p>
        </>
      ) : now.length > 0 && compared ? (
        <>
          <h2 className="card__title">{it.phaseTitle(t.phaseView.phasesIn[compared])}</h2>
          {rows(now)}
          <p className="insight-card__legend muted small">{it.legend}</p>
        </>
      ) : (
        <>
          <h2 className="card__title">{it.emptyTitle}</h2>
          <p className="muted">{it.emptyText}</p>
          <div className="insight-progress" role="progressbar" aria-valuemin={0} aria-valuemax={INSIGHT_TARGET_DAYS} aria-valuenow={Math.min(logged, INSIGHT_TARGET_DAYS)} aria-label={it.progressLabel}>
            <span style={{ '--w': `${Math.min(100, (logged / INSIGHT_TARGET_DAYS) * 100)}%` } as CSSProperties} />
          </div>
          <p className="muted small">{it.progress(logged)}</p>
        </>
      )}
    </section>
  );
}
