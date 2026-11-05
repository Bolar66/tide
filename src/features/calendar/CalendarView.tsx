import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { useRef, useState } from 'react';
import { IconChevronLeft, IconChevronRight } from '../../components/icons';
import { fromISO, toISO, type ISODate } from '../../domain/dates';
import { useCycle } from '../../hooks/useCycle';
import { capitalize, longDate, monthTitle, t } from '../../i18n/fi';
import { useTide } from '../../store/context';
import { DaySheet } from '../day/DaySheet';
import './calendar.css';

const SWIPE_PX = 50;

export function CalendarView() {
  const { today, marks } = useCycle();
  const days = useTide((s) => s.days);
  const [month, setMonth] = useState(() => startOfMonth(fromISO(today)));
  const [selected, setSelected] = useState<ISODate | null>(null);
  const touchX = useRef<number | null>(null);

  const cells = eachDayOfInterval({
    start: startOfWeek(month, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const isCurrentMonth = isSameMonth(month, fromISO(today));
  const shift = (n: number) => setMonth((m) => addMonths(m, n));

  return (
    <div className="stack">
      <header className="page-header">
        <h1>{capitalize(monthTitle(month))}</h1>
        <div className="calendar__nav">
          {!isCurrentMonth && (
            <button type="button" className="button button--ghost button--small" onClick={() => setMonth(startOfMonth(fromISO(today)))}>
              {t.calendar.today}
            </button>
          )}
          <button type="button" className="icon-button" onClick={() => shift(-1)} aria-label={t.calendar.prev}>
            <IconChevronLeft />
          </button>
          <button type="button" className="icon-button" onClick={() => shift(1)} aria-label={t.calendar.next}>
            <IconChevronRight />
          </button>
        </div>
      </header>

      <div
        className="card calendar"
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const startX = touchX.current;
          const endX = e.changedTouches[0]?.clientX;
          touchX.current = null;
          if (startX === null || endX === undefined) return;
          const dx = endX - startX;
          if (Math.abs(dx) > SWIPE_PX) shift(dx < 0 ? 1 : -1);
        }}
      >
        <div className="calendar__grid" role="grid" aria-label={monthTitle(month)}>
          {t.calendar.weekdays.map((d) => (
            <div key={d} className="calendar__weekday" role="columnheader">
              {d}
            </div>
          ))}
          {cells.map((day) => {
            const iso = toISO(day);
            const mark = marks.get(iso);
            const entry = days[iso];
            const logged = entry && (entry.symptoms || entry.note || entry.metrics);
            const classes = [
              'calendar__day',
              !isSameMonth(day, month) && 'calendar__day--outside',
              iso === today && 'calendar__day--today',
              mark && `calendar__day--${mark}`,
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={iso}
                type="button"
                role="gridcell"
                className={classes}
                disabled={iso > today && !mark}
                aria-label={`${longDate(iso)}${mark === 'period' ? `, ${t.calendar.legendPeriod}` : mark === 'predicted' ? `, ${t.calendar.legendPredicted}` : ''}`}
                aria-current={iso === today ? 'date' : undefined}
                onClick={() => setSelected(iso)}
              >
                <span className="calendar__num">{day.getDate()}</span>
                {logged && <span className="calendar__dot" aria-hidden />}
              </button>
            );
          })}
        </div>

        <div className="calendar__legend" aria-hidden>
          <span><i className="legend legend--period" />{t.calendar.legendPeriod}</span>
          <span><i className="legend legend--predicted" />{t.calendar.legendPredicted}</span>
          <span><i className="legend legend--logged" />{t.calendar.legendLogged}</span>
        </div>
      </div>

      <DaySheet date={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
