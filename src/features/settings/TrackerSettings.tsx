import { Switch } from '../../components/Switch';
import { useI18n } from '../../i18n';
import { SELECTABLE_TRACKERS, TRACKER_GROUPS } from '../../trackers/registry';

interface Props {
  enabled: readonly string[];
  onChange: (ids: string[]) => void;
}

/** Grouped on/off list of wellbeing trackers. Used in settings and onboarding. */
export function TrackerSettings({ enabled, onChange }: Props) {
  const { t } = useI18n();
  const toggle = (id: string, on: boolean) => onChange(on ? [...enabled, id] : enabled.filter((x) => x !== id));
  return (
    <div className="tracker-settings">
      {TRACKER_GROUPS.map((group) => (
        <div key={group} className="tracker-settings__group">
          <h3 className="section-label">{t.trackers.groups[group]}</h3>
          <ul className="list">
            {SELECTABLE_TRACKERS.filter((d) => d.group === group).map((d) => (
              <li key={d.id}>
                <Switch
                  label={t.trackers.items[d.id]?.settingsLabel ?? t.trackers.items[d.id]?.label ?? d.id}
                  checked={enabled.includes(d.id)}
                  onChange={(on) => toggle(d.id, on)}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
