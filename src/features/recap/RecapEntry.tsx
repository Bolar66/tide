import { useMemo, useState } from 'react';
import { IconChevronRight, IconSparkle } from '../../components/icons';
import { diffDays } from '../../domain/dates';
import { sortPeriods } from '../../domain/periods';
import { lastCycleRecap, RECAP_OFFER_DAYS } from '../../domain/recap';
import { useCycle } from '../../hooks/useCycle';
import { useI18n } from '../../i18n';
import { useTide } from '../../store/context';
import { RecapStory } from './RecapStory';

const SEEN_KEY = 'tide.recapSeen';

function useRecap() {
  const days = useTide((s) => s.days);
  const { periods, today } = useCycle();
  const recap = useMemo(() => lastCycleRecap(periods, days, today), [periods, days, today]);
  const latestStart = sortPeriods(periods).filter((p) => p.start <= today).at(-1)?.start;
  return { recap, daysIntoCycle: latestStart ? diffDays(today, latestStart) : null };
}

/** Home card for the first week of a new cycle: "Edellinen kiertosi on valmis". */
export function RecapCard() {
  const { t } = useI18n();
  const { recap, daysIntoCycle } = useRecap();
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY);
    } catch {
      return null;
    }
  });
  const [open, setOpen] = useState(false);
  const markSeen = () => {
    if (!recap) return;
    setSeen(recap.start);
    try {
      localStorage.setItem(SEEN_KEY, recap.start);
    } catch {
      /* ignore */
    }
  };

  if (!recap || daysIntoCycle === null || daysIntoCycle >= RECAP_OFFER_DAYS || (seen === recap.start && !open)) return null;
  return (
    <section className="card recap-card">
      <p className="eyebrow recap-card__eyebrow">
        <IconSparkle width={16} height={16} aria-hidden /> {t.recap.title}
      </p>
      <h2 className="card__title">{t.recap.cardTitle}</h2>
      <p className="muted">{t.recap.cardText}</p>
      <div className="recap-card__actions">
        <button type="button" className="button" onClick={() => setOpen(true)}>
          {t.recap.open}
        </button>
        <button type="button" className="button button--ghost button--small" onClick={markSeen}>
          {t.recap.later}
        </button>
      </div>
      {open && (
        <RecapStory
          recap={recap}
          onClose={() => {
            setOpen(false);
            markSeen();
          }}
        />
      )}
    </section>
  );
}

/** Row under Kierto → Tilastot: open the latest recap at any time. */
export function RecapRow() {
  const { t } = useI18n();
  const { recap } = useRecap();
  const [open, setOpen] = useState(false);
  if (!recap) return null;
  return (
    <li>
      <button type="button" className="list__row" onClick={() => setOpen(true)}>
        <span className="list__icon">
          <IconSparkle />
        </span>
        <span className="list__text">
          {t.recap.statsRow}
          <span className="list__sub">{t.recap.statsRowHint}</span>
        </span>
        <IconChevronRight className="list__chevron" />
      </button>
      {open && <RecapStory recap={recap} onClose={() => setOpen(false)} />}
    </li>
  );
}
