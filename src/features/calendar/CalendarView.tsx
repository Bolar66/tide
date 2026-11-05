import { swipeHandlers } from '../../hooks/useSwipe';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, getISODay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { useState, type ReactNode } from 'react';
import { IconChevronLeft, IconChevronRight } from '../../components/icons';
import type { DayMark } from '../../domain/calendar';
import { addDaysISO, fromISO, toISO, type ISODate } from '../../domain/dates';
import type { DayEntry } from '../../domain/types';
import { useCycle } from '../../hooks/useCycle';
import { capitalize, useI18n } from '../../i18n';
import { useTide } from '../../store/context';
import { DaySheet } from '../day/DaySheet';
import './calendar.css';


/** Someone else's shared data shown read-only in the same calendar. */
export interface CalendarSource {
  marks: ReadonlyMap<ISODate, DayMark>;
  days: Readonly<Record<ISODate, DayEntry>>;
  showFertile: boolean;
}

interface Props {
  source?: CalendarSource;
  /** Replaces the default eyebrow, e.g. the person's name. */
  eyebrow?: string;
  /** Content between the header and the calendar (e.g. a person picker). */
  above?: ReactNode;
}

export function CalendarView({ source, eyebrow, above }: Props = {}) {
  const { t, f } = useI18n();
  const own = useCycle();
  const ownDays = useTide((s) => s.days);
  const today = own.today;
  const marks = source?.marks ?? own.marks;
  const days = source?.days ?? ownDays;
  const fertile = source ? (source.showFertile ? [null] : []) : own.fertile;
  const readOnly = source !== undefined;
  const [month, setMonth] = useState(() => startOfMonth(fromISO(today)));
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [selected, setSelected] = useState<ISODate | null>(null);

  const cells = eachDayOfInterval({
    start: startOfWeek(month, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const isCurrentMonth = isSameMonth(month, fromISO(today));
  const shift = (n: number) => {
    setDirection(n > 0 ? 'next' : 'prev');
    setMonth((m) => addMonths(m, n));
  };

  return (
    <div className="stack stack--lg">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            {eyebrow ?? t.tabs.calendar} · {f.year(month)}
          </p>
          <h1 className="display calendar-title">{capitalize(f.monthName(month))}</h1>
        </div>
        <div className="calendar__nav">
          <button type="button" className="icon-button icon-button--filled" onClick={() => shift(-1)} aria-label={t.calendar.prev}>
            <IconChevronLeft />
          </button>
          <button type="button" className="icon-button icon-button--filled" onClick={() => shift(1)} aria-label={t.calendar.next}>
            <IconChevronRight />
          </button>
        </div>
      </header>
      {above}

      <div
        className="card calendar"
        data-swipe="own"
        {...swipeHandlers((dir) => shift(dir === 'left' ? 1 : -1), { ownArea: true })}
      >
        <div className="calendar__weekdays" aria-hidden>
          {f.weekdaysShort().map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div
          key={month.getTime()}
          className={`calendar__grid${direction ? ` calendar__grid--${direction}` : ''}`}
          role="grid"
          aria-label={f.monthTitle(month)}
        >
          {cells.map((day) => {
            const iso = toISO(day);
            const mark = marks.get(iso);
            const weekday = getISODay(day);
            const entry = days[iso];
            const logged = entry && (entry.symptoms || entry.note || entry.metrics);
            // Ovulation sits inside the fertile band, so both count as one band.
            const group = (m: typeof mark) => (m === 'ovulation' ? 'fertile' : m);
            const bandStart = mark && (weekday === 1 || group(marks.get(addDaysISO(iso, -1))) !== group(mark));
            const bandEnd = mark && (weekday === 7 || group(marks.get(addDaysISO(iso, 1))) !== group(mark));
            const classes = [
              'calendar__day',
              !isSameMonth(day, month) && 'calendar__day--outside',
              iso === today && 'calendar__day--today',
              mark && `calendar__day--${mark}`,
              bandStart && 'calendar__day--band-start',
              bandEnd && 'calendar__day--band-end',
            ]
              .filter(Boolean)
              .join(' ');
            const markLabel = {
              period: t.calendar.legendPeriod,
              predicted: t.calendar.legendPredicted,
              fertile: t.calendar.legendFertile,
              ovulation: t.phases.names.ovulation,
            }[mark ?? 'none' as never] ?? null;
            return (
              <button
                key={iso}
                type="button"
                role="gridcell"
                className={classes}
                disabled={readOnly || iso > today}
                aria-label={[f.longDate(iso), markLabel].filter(Boolean).join(', ')}
                aria-current={iso === today ? 'date' : undefined}
                onClick={() => setSelected(iso)}
              >
                <span className="calendar__num tabular">{day.getDate()}</span>
                {logged && <span className="calendar__dot" aria-hidden />}
              </button>
            );
          })}
        </div>

        <div className="calendar__footer">
          <div className="calendar__legend" aria-hidden>
            <span>
              <i className="legend legend--period" />
              {t.calendar.legendPeriod}
            </span>
            <span>
              <i className="legend legend--predicted" />
              {t.calendar.legendPredicted}
            </span>
            {fertile.length > 0 && (
              <span>
                <i className="legend legend--fertile" />
                {t.calendar.legendFertile}
              </span>
            )}
            <span>
              <i className="legend legend--logged" />
              {t.calendar.legendLogged}
            </span>
          </div>
          {!isCurrentMonth && (
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => {
                setDirection(month > fromISO(today) ? 'prev' : 'next');
                setMonth(startOfMonth(fromISO(today)));
              }}
            >
              {t.calendar.today}
            </button>
          )}
        </div>
      </div>

      {fertile.length > 0 && <p className="muted small calendar__disclaimer">{t.phases.fertileNote}</p>}

      {!readOnly && <DaySheet date={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
