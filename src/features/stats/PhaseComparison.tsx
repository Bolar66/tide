import { useMemo, type CSSProperties } from 'react';
import { COMPARED_PHASES, PHASE_METRICS, phaseAverages, phaseInsight, type PhaseMetricId } from '../../domain/phaseStats';
import { useCycle } from '../../hooks/useCycle';
import { useI18n } from '../../i18n';
import { useTide } from '../../store/context';

const fi1 = (n: number) => new Intl.NumberFormat('fi-FI', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

/** Axis maximum per metric: scales are 1–5, sleep is hours. */
const axisMax = (metric: PhaseMetricId, values: number[]) => (metric === 'sleepHours' ? Math.max(9, ...values) : 5);

/**
 * Small multiples: one chart per metric, the four phases as columns. A single series per chart,
 * so one colour and no legend; values are printed on the bars and the table has screen-reader text.
 */
export function PhaseComparison() {
  const { t } = useI18n();
  const days = useTide((s) => s.days);
  const { periods, stats, today } = useCycle();
  const table = useMemo(() => phaseAverages(periods, days, stats, today), [periods, days, stats, today]);

  const rows = PHASE_METRICS.map((m) => m.id).filter((id) => COMPARED_PHASES.some((p) => table[id][p] !== null));

  return (
    <section className="card enter" style={{ '--i': 4 } as CSSProperties}>
      <h2 className="card__title">{t.phaseView.title}</h2>
      {rows.length === 0 ? (
        <p className="muted">{t.phaseView.empty}</p>
      ) : (
        <>
          <p className="muted small phase-chart__intro">{t.phaseView.intro}</p>
          <div className="phase-chart">
            {rows.map((metric) => {
              const values = COMPARED_PHASES.map((p) => table[metric][p]?.mean ?? 0);
              const max = axisMax(metric, values);
              const insight = phaseInsight(table, metric);
              const label = t.phaseView.metrics[metric];
              return (
                <figure key={metric} className="phase-chart__metric">
                  <figcaption className="phase-chart__label">{label}</figcaption>
                  <div className="phase-chart__cols">
                    {COMPARED_PHASES.map((phase) => {
                      const v = table[metric][phase];
                      return (
                        <div key={phase} className="phase-chart__col">
                          <span className="phase-chart__value tabular">{v ? fi1(v.mean) : '–'}</span>
                          <span className="phase-chart__track" aria-hidden>
                            {v && <span className="phase-chart__bar" style={{ height: `${(v.mean / max) * 100}%` }} />}
                          </span>
                          <span className="phase-chart__phase">{t.phaseView.phases[phase]}</span>
                          <span className="visually-hidden">
                            {v ? `${fi1(v.mean)}, ${t.phaseView.days(v.n)}` : t.phaseView.noData}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {insight && (
                    <p className="phase-chart__insight">
                      {t.phaseView.insight(
                        label,
                        insight.high && t.phaseView.phasesIn[insight.high],
                        insight.low && t.phaseView.phasesIn[insight.low],
                        fi1(insight.difference),
                        metric === 'sleepHours',
                      )}
                    </p>
                  )}
                </figure>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
