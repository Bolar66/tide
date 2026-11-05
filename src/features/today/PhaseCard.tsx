import type { Phase } from '../../domain/phases';
import { useI18n } from '../../i18n';

export function PhaseCard({ phase, showFertileNote }: { phase: Phase; showFertileNote: boolean }) {
  const { t } = useI18n();
  return (
    <section className={`card phase-card phase-card--${phase}`}>
      <p className="eyebrow">{t.phases.title}</p>
      <h2 className="card__title phase-card__name">{t.phases.names[phase]}</h2>
      <p className="phase-card__text">{t.phases.descriptions[phase]}</p>
      {showFertileNote && <p className="phase-card__note">{t.phases.fertileNote}</p>}
    </section>
  );
}
