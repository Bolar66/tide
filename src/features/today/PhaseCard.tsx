import { useState } from 'react';
import { IconSparkle } from '../../components/icons';
import type { Phase } from '../../domain/phases';
import { useI18n } from '../../i18n';

interface Props {
  phase: Phase;
  cycleDay: number;
  showFertileNote: boolean;
}

/** Phase summary with an expandable explanation and a tip that changes every day. */
export function PhaseCard({ phase, cycleDay, showFertileNote }: Props) {
  const { t } = useI18n();
  const p = t.phases;
  const [open, setOpen] = useState(false);
  const tips = p.tips[phase];
  const tip = tips[(cycleDay - 1) % tips.length];

  return (
    <section className={`card phase-card phase-card--${phase}`}>
      <p className="eyebrow">
        {p.title} · {p.dayLabel(cycleDay)}
      </p>
      <h2 className="card__title phase-card__name">{p.names[phase]}</h2>
      <p className="phase-card__text">{p.summaries[phase]}</p>

      {open && (
        <div className="phase-card__more">
          <h3 className="section-label">{p.bodyTitle}</h3>
          <p className="phase-card__text">{p.body[phase]}</p>
          <h3 className="section-label">{p.noticeTitle}</h3>
          <ul className="phase-card__notice">
            {p.notice[phase].map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" className="button button--ghost button--small phase-card__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? p.readLess : p.readMore}
      </button>

      {tip && (
        <div className="phase-card__tip">
          <IconSparkle width={18} height={18} aria-hidden />
          <div>
            <p className="phase-card__tip-title">{p.tipTitle}</p>
            <p>{tip}</p>
          </div>
        </div>
      )}
      {showFertileNote && <p className="phase-card__note">{p.fertileNote}</p>}
    </section>
  );
}
