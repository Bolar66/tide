import { useState } from 'react';
import { Segmented } from '../../components/Segmented';
import { deriveCycle } from '../../domain/cycleSummary';
import { useToday } from '../../hooks/useToday';
import { useI18n } from '../../i18n';
import { useSession } from '../../session/context';
import { CalendarView } from '../calendar/CalendarView';
import './followed.css';

/** Calendar of the people who share their cycle with this user (read-only). */
export function FollowedCalendar() {
  const { t } = useI18n();
  const session = useSession();
  const today = useToday();
  const people = session.followed.filter((f) => f.data?.scopes.includes('cycle'));
  const [selected, setSelected] = useState(people[0]?.id ?? '');
  const person = people.find((p) => p.id === selected) ?? people[0];

  const data = person?.data ?? null;
  const cycle = data
    ? deriveCycle({
      periods: data.periods,
      today,
      cycleHint: data.cycleLengthHint,
      periodHint: data.periodLengthHint,
      showFertility: data.scopes.includes('fertile'),
      })
    : null;
  const source =
    data && cycle
      ? { marks: cycle.marks, days: Object.fromEntries(data.days.map((d) => [d.date, d])), showFertile: cycle.fertile.length > 0 }
      : null;

  if (!person || !source) {
    return (
      <div className="stack stack--lg">
        <header className="page-header">
          <h1 className="display">{t.tabs.calendar}</h1>
        </header>
        <section className="card followed-empty">
          <p>{t.followed.empty}</p>
        </section>
      </div>
    );
  }

  return (
    <CalendarView
      key={person.id}
      source={source}
      eyebrow={person.data?.ownerName}
      above={
        people.length > 1 ? (
          <Segmented
            label={t.followed.calendarFor}
            options={people.map((p) => ({ value: p.id, label: p.data?.ownerName || '?' }))}
            value={person.id}
            onChange={setSelected}
          />
        ) : null
      }
    />
  );
}
