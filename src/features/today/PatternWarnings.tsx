import { IconSparkle } from '../../components/icons';
import type { PatternWarning } from '../../domain/patterns';
import { useI18n } from '../../i18n';

export function PatternWarnings({ warnings }: { warnings: PatternWarning[] }) {
  const { t } = useI18n();
  if (warnings.length === 0) return null;
  return (
    <section className="insights" aria-label={t.patterns.title}>
      {warnings.map((w) => (
        <div key={w.symptom} className="insight">
          <span className="insight__icon" aria-hidden>
            <IconSparkle width={20} height={20} />
          </span>
          <div>
            <p className="insight__title">{t.patterns.title}</p>
            <p className="insight__text">
              {t.patterns.text(t.patterns.symptom[w.symptom], t.patterns.when(w.daysAhead), w.hits, w.cycles)}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}
