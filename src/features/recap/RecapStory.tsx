import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from '../../components/icons';
import { PhaseArt } from '../../components/PhaseArt';
import { cyclePhase } from '../../domain/phases';
import type { CycleRecap } from '../../domain/recap';
import { useI18n } from '../../i18n';
import './recap.css';

/** One small line chart: a single series, so one colour and the title names it. */
function Spark({ values, label }: { values: (number | null)[]; label: string }) {
  const w = 280;
  const h = 90;
  const x = (i: number) => (values.length <= 1 ? 0 : (i / (values.length - 1)) * w);
  const y = (v: number) => h - ((v - 1) / 4) * (h - 12) - 6;
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    pen = true;
  });
  const logged = values.filter((v) => v !== null).length;
  return (
    <figure className="recap-spark">
      <figcaption>{label}</figcaption>
      {logged === 0 ? (
        <p className="recap-spark__empty">–</p>
      ) : (
        <svg viewBox={`-6 0 ${w + 12} ${h}`} role="img" aria-label={label}>
          <line x1="0" x2={w} y1={y(3)} y2={y(3)} className="recap-spark__mid" />
          <path d={d} className="recap-spark__line" />
          {values.map((v, i) => (v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r="3" className="recap-spark__dot" />))}
        </svg>
      )}
    </figure>
  );
}

/** Full-screen, tap-through story of the finished cycle. Calm: no auto-advance. */
export function RecapStory({ recap, onClose }: { recap: CycleRecap; onClose: () => void }) {
  const { t, f } = useI18n();
  const r = t.recap;
  const [index, setIndex] = useState(0);

  const diff = recap.previousAverage === null ? null : Math.round(recap.length - recap.previousAverage);
  const bestPhase = recap.bestDays
    ? cyclePhase({ cycleDay: recap.bestDays.from + 1, cycleLength: recap.length, inPeriod: recap.bestDays.from + 1 <= recap.periodLength })
    : null;
  const label = (id: string) => (id in t.symptoms ? t.symptoms[id as keyof typeof t.symptoms].label : (t.trackers.items[id]?.label ?? id));

  const slides = [
    <>
      <p className="recap__eyebrow">{r.eyebrow(f.shortDate(recap.start), f.shortDate(recap.end))}</p>
      <h2 className="recap__title display">{r.doneTitle}</h2>
      <p className="recap__big display tabular">{recap.length}</p>
      <p className="recap__unit">{r.daysLong}</p>
      <p className="recap__text">{diff === null ? r.firstCycle : diff === 0 ? r.sameAsAverage : r.vsAverage(diff)}</p>
    </>,
    <>
      <PhaseArt phase="menstrual" size={110} className="recap__art" />
      <h2 className="recap__title display">{r.periodTitle(recap.periodLength)}</h2>
      <div className="recap__meter" style={{ '--w': `${(recap.loggedDays / recap.length) * 100}%` } as CSSProperties} aria-hidden>
        <span />
      </div>
      <p className="recap__text">{r.logged(recap.loggedDays, recap.length)}</p>
    </>,
    <>
      <h2 className="recap__title display">{r.moodTitle}</h2>
      <Spark values={recap.mood} label={t.symptoms.mood.label} />
      <Spark values={recap.energy} label={t.symptoms.energy.label} />
      <p className="recap__text recap__text--small">{r.chartNote}</p>
    </>,
    <>
      {bestPhase && <PhaseArt phase={bestPhase} size={110} className="recap__art" />}
      <h2 className="recap__title display">{recap.bestDays ? r.bestTitle : r.noBestTitle}</h2>
      <p className="recap__text">
        {recap.bestDays && bestPhase ? r.best(recap.bestDays.from, recap.bestDays.to, t.phaseView.phasesIn[bestPhase === 'late' ? 'luteal' : bestPhase]) : r.noBest}
      </p>
    </>,
    <>
      <h2 className="recap__title display">{r.symptomsTitle}</h2>
      {recap.topSymptoms.length === 0 ? (
        <p className="recap__text">{r.noSymptoms}</p>
      ) : (
        <ol className="recap__list">
          {recap.topSymptoms.map((s) => (
            <li key={s.id}>
              <span>{label(s.id)}</span>
              <span className="tabular">{r.days(s.days)}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="recap__text recap__text--small">{r.symptomsNote}</p>
    </>,
    <>
      <h2 className="recap__title display">{r.thanksTitle}</h2>
      <p className="recap__text">{r.thanks}</p>
      <button type="button" className="button recap__done" onClick={onClose}>
        {r.done}
      </button>
    </>,
  ];

  const last = slides.length - 1;
  const go = (d: number) => setIndex((i) => Math.min(last, Math.max(0, i + d)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    document.documentElement.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('no-scroll');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="recap" role="dialog" aria-modal="true" aria-label={r.title}>
      <div className="recap__progress" aria-hidden>
        {slides.map((_, i) => (
          <span key={i} className={i < index ? 'is-done' : i === index ? 'is-active' : ''} />
        ))}
      </div>
      <button type="button" className="icon-button icon-button--filled recap__close" onClick={onClose} aria-label={t.common.close}>
        <IconClose width={20} height={20} />
      </button>
      <div
        className="recap__stage"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          const rect = e.currentTarget.getBoundingClientRect();
          go(e.clientX - rect.left < rect.width / 3 ? -1 : 1);
        }}
      >
        <section key={index} className="recap__slide" aria-live="polite">
          {slides[index]}
        </section>
      </div>
      <p className="recap__tap">{index < last ? r.tapHint : ''}</p>
    </div>,
    document.body,
  );
}
