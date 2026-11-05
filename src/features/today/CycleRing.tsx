import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cyclePhase } from '../../domain/phases';
import type { Ring } from '../../domain/ring';
import { useI18n } from '../../i18n';
import { IconChevronRight } from '../../components/icons';
import { useCountUp } from '../../hooks/useCountUp';
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
  cycleLength: number;
  status: string;
  /** Opens the calendar. Without it the ring is display-only (e.g. a partner's cycle). */
  onOpen?: () => void;
  /** Changes whenever today's log changes: today's dot gives a little pulse. */
  pulse?: number;
  /** ± days around the expected next start, drawn as a soft arc where the ring closes. */
  spread?: number;
  /** Called the first time the user scrubs (hides the one-time hint). */
  onScrubbed?: () => void;
}

/** Touches that start on the band of dots scrub through the days instead of scrolling. */
const BAND_INNER = DISC_R - 6;
const BAND_OUTER = 162;
const SCRUB_LINGER_MS = 1800;

const arc = (r: number, from: number, to: number) => {
  const p = (a: number) => `${C + r * Math.cos(a)} ${C + r * Math.sin(a)}`;
  return `M${p(from)} A${r} ${r} 0 ${to - from > Math.PI ? 1 : 0} 1 ${p(to)}`;
};

/**
 * Home screen hero: the days of the current cycle as dots around a disc whose "tide" rises
 * through the cycle. The whole ring opens the calendar (and morphs into it via view transitions).
 */
export function CycleRing({ ring, cycleLength, status, onOpen, pulse = 0, spread, onScrubbed }: Props) {
  const { t, f } = useI18n();
  const root = useRef<HTMLElement>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const scrubbed = useRef(false);
  const onScrubbedRef = useRef(onScrubbed);
  useEffect(() => {
    onScrubbedRef.current = onScrubbed;
  }, [onScrubbed]);
  const n0 = ring.days.length;

  // Native, non-passive listeners: preventDefault on touchmove keeps the page still while scrubbing.
  useEffect(() => {
    const el = root.current;
    if (!el || ring.cycleDay === null) return;
    let active = false;
    let timer: number | undefined;
    const indexAt = (x: number, y: number): number | null => {
      const rect = el.getBoundingClientRect();
      const scale = SIZE / rect.width;
      const dx = (x - rect.left) * scale - C;
      const dy = (y - rect.top) * scale - C;
      const r = Math.hypot(dx, dy);
      if (!active && (r < BAND_INNER || r > BAND_OUTER)) return null;
      const a = (Math.atan2(dy, dx) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
      return Math.round((a / (Math.PI * 2)) * n0) % n0;
    };
    const start = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch || e.touches.length > 1) return;
      const i = indexAt(touch.clientX, touch.clientY);
      if (i === null) return;
      active = true;
      window.clearTimeout(timer);
      setScrub(i);
    };
    const move = (e: TouchEvent) => {
      if (!active) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      if (!scrubbed.current) onScrubbedRef.current?.();
      scrubbed.current = true;
      const i = indexAt(touch.clientX, touch.clientY);
      if (i !== null) setScrub(i);
    };
    const end = () => {
      if (!active) return;
      active = false;
      timer = window.setTimeout(() => setScrub(null), SCRUB_LINGER_MS);
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      window.clearTimeout(timer);
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [n0, ring.cycleDay]);

  const picked = scrub !== null ? ring.days[scrub] : undefined;
  const today = ring.days.find((d) => d.isToday)?.date;
  const pickedKind = (() => {
    if (!picked) return '';
    if (picked.kind === 'period' && today && picked.date > today) return t.ring.scrubKinds.periodPredicted;
    return t.ring.scrubKinds[picked.kind];
  })();
  const pickedPhase =
    picked && scrub !== null ? t.phases.names[cyclePhase({ cycleDay: scrub + 1, cycleLength: n0, inPeriod: picked.kind === 'period' })] : '';
  const shownDay = useCountUp(ring.cycleDay ?? 0);
  const n = ring.days.length;
  // Keep a little water even on day 1 and never fill the disc completely.
  const level = C + DISC_R - (0.14 + ring.progress * 0.68) * DISC_R * 2;

  const Root = onOpen ? 'button' : 'div';
  const rootProps = onOpen
    ? { type: 'button' as const, onClick: onOpen, 'aria-label': undefined as string | undefined }
    : { role: 'img' as const, 'aria-label': undefined as string | undefined };

  const label = [
    t.ring.openCalendar,
    ring.cycleDay ? `${t.ring.cycleDay} ${ring.cycleDay} ${t.ring.ofLength(Math.max(cycleLength, ring.cycleDay))}` : t.ring.noData,
    status,
  ]
    .filter((x) => onOpen || x !== t.ring.openCalendar)
    .join('. ');
  rootProps['aria-label'] = label;

  return (
    <Root
      ref={root as never}
      className={`cycle-ring ${picked ? 'is-scrubbing' : ''}`}
      {...rootProps}
      onClick={
        onOpen
          ? () => {
              // A scrub ends with a click on some browsers; it should not open the calendar.
              if (scrubbed.current) {
                scrubbed.current = false;
                return;
              }
              onOpen();
            }
          : undefined
      }
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="cycle-ring__svg" aria-hidden>
        <defs>
          <clipPath id="cycle-ring-disc">
            <circle cx={C} cy={C} r={DISC_R} />
          </clipPath>
        </defs>

        <circle cx={C} cy={C} r={DISC_R} className="cycle-ring__disc" />
        <g clipPath="url(#cycle-ring-disc)">
          {/* The tide rises into place on load and moves smoothly when the level changes. */}
          <g className="cycle-ring__tide" style={{ transform: `translateY(${level}px)` }}>
            <path d={wavePath(4, 7)} className="cycle-ring__wave cycle-ring__wave--back" />
            <path d={wavePath(0, 5)} className="cycle-ring__wave cycle-ring__wave--front" />
          </g>
        </g>

        {spread !== undefined && ring.cycleDay !== null && (
          <path
            d={arc(DOT_R + 13, ((n0 - spread - 0.5) / n0) * Math.PI * 2 - Math.PI / 2, ((n0 + spread - 0.5) / n0) * Math.PI * 2 - Math.PI / 2)}
            className="cycle-ring__window"
          >
            <title>{t.ring.nextWindow}</title>
          </path>
        )}

        {picked && scrub !== null && (
          <circle
            cx={C + DOT_R * Math.cos((scrub / n0) * Math.PI * 2 - Math.PI / 2)}
            cy={C + DOT_R * Math.sin((scrub / n0) * Math.PI * 2 - Math.PI / 2)}
            r={12}
            className="cycle-ring__pick"
          />
        )}

        {ring.days.map((day, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          const x = C + DOT_R * Math.cos(a);
          const y = C + DOT_R * Math.sin(a);
          const style = { '--i': i } as CSSProperties;
          if (day.isToday) {
            return (
              <g key={day.date} className="cycle-ring__dot" style={style}>
                <circle cx={x} cy={y} r={13} className="cycle-ring__halo" />
                {pulse > 0 && <circle key={pulse} cx={x} cy={y} r={13} className="cycle-ring__ping" />}
                <circle cx={x} cy={y} r={7.5} className="cycle-ring__today" />
              </g>
            );
          }
          return (
            <circle
              key={day.date}
              cx={x}
              cy={y}
              r={day.kind === 'period' ? 6 : day.kind === 'ovulation' ? 6 : day.kind === 'fertile' ? 4.5 : 3.5}
              className={`cycle-ring__dot cycle-ring__dot--${day.kind}`}
              style={style}
            />
          );
        })}
      </svg>

      <span className="cycle-ring__center">
        {picked && scrub !== null ? (
          <>
            <span className="cycle-ring__eyebrow">{picked.isToday ? t.ring.scrubToday : f.weekdayDate(picked.date)}</span>
            <span className="cycle-ring__number display tabular">
              {scrub + 1}
              <span className="cycle-ring__of">{t.ring.ofLength(n0)}</span>
            </span>
            <span className="cycle-ring__status">{pickedKind || pickedPhase}</span>
            {pickedKind && <span className="cycle-ring__hint">{pickedPhase}</span>}
          </>
        ) : ring.cycleDay !== null ? (
          <>
            <span className="cycle-ring__eyebrow">{t.ring.cycleDay}</span>
            <span className="cycle-ring__number display tabular">
              {shownDay || ring.cycleDay}
              <span className="cycle-ring__of">{t.ring.ofLength(Math.max(cycleLength, ring.cycleDay))}</span>
            </span>
          </>
        ) : (
          <span className="cycle-ring__empty display">{t.ring.noData}</span>
        )}
        {!picked && <span className="cycle-ring__status">{status}</span>}
        {onOpen && !picked && (
          <span className="cycle-ring__hint">
            {t.ring.calendarHint}
            <IconChevronRight width={14} height={14} />
          </span>
        )}
      </span>
    </Root>
  );
}
