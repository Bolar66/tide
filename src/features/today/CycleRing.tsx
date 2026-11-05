import type { CSSProperties } from 'react';
import type { Ring } from '../../domain/ring';
import { useI18n } from '../../i18n';
import { IconChevronRight } from '../../components/icons';
import './ring.css';

const SIZE = 300;
const C = SIZE / 2;
const DOT_R = 136;
const DISC_R = 116;
const WAVELENGTH = 150;

/** Seamless sine path, two screen widths long, so translating it by one wavelength loops. */
function wavePath(level: number, amplitude: number): string {
  const half = WAVELENGTH / 2;
  let d = `M0 ${level}`;
  for (let x = 0; x < SIZE * 2; x += WAVELENGTH) {
    d += ` q${half / 2} ${-amplitude} ${half} 0 t${half} 0`;
  }
  return `${d} V${SIZE} H0 Z`;
}

interface Props {
  ring: Ring;
  status: string;
  onOpen: () => void;
}

/**
 * Home screen hero: the days of the current cycle as dots around a disc whose "tide" rises
 * through the cycle. The whole ring opens the calendar (and morphs into it via view transitions).
 */
export function CycleRing({ ring, status, onOpen }: Props) {
  const { t } = useI18n();
  const n = ring.days.length;
  // Keep a little water even on day 1 and never fill the disc completely.
  const level = C + DISC_R - (0.14 + ring.progress * 0.68) * DISC_R * 2;

  const label = [t.ring.openCalendar, ring.cycleDay ? `${t.ring.cycleDay} ${ring.cycleDay}` : t.ring.noData, status].join('. ');

  return (
    <button type="button" className="cycle-ring" onClick={onOpen} aria-label={label}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="cycle-ring__svg" aria-hidden>
        <defs>
          <clipPath id="cycle-ring-disc">
            <circle cx={C} cy={C} r={DISC_R} />
          </clipPath>
        </defs>

        <circle cx={C} cy={C} r={DISC_R} className="cycle-ring__disc" />
        <g clipPath="url(#cycle-ring-disc)">
          <path d={wavePath(level + 4, 7)} className="cycle-ring__wave cycle-ring__wave--back" />
          <path d={wavePath(level, 5)} className="cycle-ring__wave cycle-ring__wave--front" />
        </g>

        {ring.days.map((day, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          const x = C + DOT_R * Math.cos(a);
          const y = C + DOT_R * Math.sin(a);
          const style = { '--i': i } as CSSProperties;
          if (day.isToday) {
            return (
              <g key={day.date} className="cycle-ring__dot" style={style}>
                <circle cx={x} cy={y} r={13} className="cycle-ring__halo" />
                <circle cx={x} cy={y} r={7.5} className="cycle-ring__today" />
              </g>
            );
          }
          return (
            <circle
              key={day.date}
              cx={x}
              cy={y}
              r={day.kind === 'period' ? 6 : 3.5}
              className={`cycle-ring__dot cycle-ring__dot--${day.kind}`}
              style={style}
            />
          );
        })}
      </svg>

      <span className="cycle-ring__center">
        {ring.cycleDay !== null ? (
          <>
            <span className="cycle-ring__eyebrow">{t.ring.cycleDay}</span>
            <span className="cycle-ring__number display tabular">{ring.cycleDay}</span>
          </>
        ) : (
          <span className="cycle-ring__empty display">{t.ring.noData}</span>
        )}
        <span className="cycle-ring__status">{status}</span>
        <span className="cycle-ring__hint">
          {t.ring.calendarHint}
          <IconChevronRight width={14} height={14} />
        </span>
      </span>
    </button>
  );
}
