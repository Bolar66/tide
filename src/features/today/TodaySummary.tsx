import { useState } from 'react';
import { IconPlus } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import type { ISODate } from '../../domain/dates';
import type { Scale5 } from '../../domain/types';
import { useI18n } from '../../i18n';
import { useTide } from '../../store/context';
import { trackerById } from '../../trackers/registry';
import { LogPanel } from '../day/LogPanel';

const MAX_CHIPS = 5;

/** What has been logged today at a glance, with one button to log more. */
export function TodaySummary({ date, onChooseTrackers }: { date: ISODate; onChooseTrackers: () => void }) {
  const { t, f } = useI18n();
  const entry = useTide((s) => s.days[date]);
  const [open, setOpen] = useState(false);

  const chips: string[] = [];
  if (entry?.flow) chips.push(`${t.day.flow}: ${t.day.flowLevels[entry.flow]}`);
  for (const key of ['cramps', 'headache', 'mood', 'energy'] as const) {
    const v = entry?.symptoms?.[key];
    if (v) chips.push(`${t.symptoms[key].label}: ${t.symptoms[key].levels[v - 1]}`);
  }
  for (const [id, v] of Object.entries(entry?.metrics ?? {})) {
    const def = trackerById(id);
    const copy = t.trackers.items[id];
    if (!def || !copy) continue;
    if (def.kind === 'scale5') chips.push(`${copy.label}: ${copy.levels?.[(v as Scale5) - 1] ?? v}`);
    else if (def.kind === 'number' || def.kind === 'count') chips.push(`${copy.label}: ${String(v).replace('.', ',')}${def.kind === 'number' ? ` ${def.unit}` : ''}`);
    else if (def.kind === 'boolean') chips.push(copy.label);
    else if (Array.isArray(v)) chips.push(`${copy.label}: ${v.map((o) => copy.options?.[o] ?? o).join(', ')}`);
    else if (typeof v === 'string') chips.push(def.kind === 'choice' ? `${copy.label}: ${copy.options?.[v] ?? v}` : copy.label);
  }
  if (entry?.note) chips.push(t.log.note);
  const shown = chips.slice(0, MAX_CHIPS);

  return (
    <section className="card today-summary">
      <h2 className="card__title">{t.today.todayLog}</h2>
      {chips.length === 0 ? (
        <p className="muted">{t.log.summaryEmpty}</p>
      ) : (
        <ul className="today-summary__chips">
          {shown.map((c) => (
            <li key={c}>{c}</li>
          ))}
          {chips.length > MAX_CHIPS && <li className="is-more">{t.log.more(chips.length - MAX_CHIPS)}</li>}
        </ul>
      )}
      <button type="button" className="button" onClick={() => setOpen(true)}>
        <IconPlus width={20} height={20} /> {t.log.button}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t.log.sheetTitle(f.weekdayDate(date))}>
        <LogPanel date={date} showPeriodActions={false} onChooseTrackers={onChooseTrackers} />
      </Sheet>
    </section>
  );
}
