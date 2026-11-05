import { useState } from 'react';
import { Segmented } from '../../components/Segmented';
import { useI18n } from '../../i18n';
import { StatsView } from '../stats/StatsView';
import { CalendarView } from './CalendarView';

/** "Kierto" tab: calendar and statistics under one roof. */
export function CycleView({ initial = 'calendar' }: { initial?: 'calendar' | 'stats' }) {
  const { t } = useI18n();
  const [view, setView] = useState(initial);
  const switcher = (
    <Segmented
      label={t.tabs.cycle}
      options={[
        { value: 'calendar', label: t.tabs.calendar },
        { value: 'stats', label: t.tabs.stats },
      ]}
      value={view}
      onChange={setView}
    />
  );
  return view === 'calendar' ? <CalendarView above={switcher} /> : <StatsView above={switcher} />;
}
