import { useState } from 'react';
import type { ISODate } from '../../domain/dates';
import { useI18n } from '../../i18n';
import { useTide } from '../../store/context';
import { enabledTrackers } from '../../trackers/registry';
import { DayEditor } from './DayEditor';
import { LOG_SECTIONS, trackerSection, type LogSection } from './sections';

/** The log split into short tabs instead of one long form. Tabs without content are hidden. */
export function LogPanel({
  date,
  onChooseTrackers,
  showPeriodActions = true,
}: {
  date: ISODate;
  onChooseTrackers?: () => void;
  showPeriodActions?: boolean;
}) {
  const { t } = useI18n();
  const trackerIds = useTide((s) => s.settings.enabledTrackers);
  const used = new Set(enabledTrackers(trackerIds).map(trackerSection));
  const tabs = LOG_SECTIONS.filter((s) => s === 'cycle' || s === 'mind' || s === 'note' || used.has(s));
  const [tab, setTab] = useState<LogSection>('cycle');
  // A brief "Saved" tick after each change, since logging has no save button.
  const entry = useTide((s) => s.days[date]);
  const [seen, setSeen] = useState(entry);
  const [saves, setSaves] = useState(0);
  if (seen !== entry) {
    setSeen(entry);
    setSaves((n) => n + 1);
  }

  return (
    <div className="log-panel">
      <div className="log-tabs" role="tablist" aria-label={t.log.title}>
        {tabs.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={tab === s} className="log-tab" onClick={() => setTab(s)}>
            {t.log.tabs[s]}
          </button>
        ))}
      </div>
      {saves > 0 && (
        <span key={saves} className="log-saved" role="status">
          <span aria-hidden>✓</span> {t.log.saved}
        </span>
      )}
      <div key={tab} className="log-panel__body" role="tabpanel">
        <DayEditor date={date} section={tab} onChooseTrackers={onChooseTrackers} showPeriodActions={showPeriodActions} />
      </div>
    </div>
  );
}
