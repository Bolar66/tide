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
  return (
    <div className="log-panel">
      <div className="log-tabs" data-swipe="own" role="tablist" aria-label={t.log.title}>
        {tabs.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={tab === s} className="log-tab" onClick={() => setTab(s)}>
            {t.log.tabs[s]}
          </button>
        ))}
      </div>
      <div key={tab} className="log-panel__body" role="tabpanel">
        <DayEditor date={date} section={tab} onChooseTrackers={onChooseTrackers} showPeriodActions={showPeriodActions} />
      </div>
    </div>
  );
}
