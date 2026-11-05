import { useState } from 'react';
import { Segmented } from '../../components/Segmented';
import { useToday } from '../../hooks/useToday';
import { capitalize, useI18n } from '../../i18n';
import { useSession } from '../../session/context';
import { useTide } from '../../store/context';
import { PartnerView } from '../partner/PartnerView';
import { TodayView } from './TodayView';

interface Props {
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  onOpenTrackers: () => void;
}

/** Home: own day, plus a switcher to partners who share with this user. */
export function HomeView(props: Props) {
  const { t, f } = useI18n();
  const session = useSession();
  const today = useToday();
  const ownTracking = useTide((s) => s.settings.ownTracking !== false);
  const options = [
    ...(ownTracking ? [{ value: 'me', label: t.partner.me }] : []),
    ...session.followed.map((fw) => ({ value: fw.id, label: fw.data?.ownerName || t.sharing.pendingFollow })),
  ];
  const [selected, setSelected] = useState<string>(options[0]?.value ?? 'me');
  const current = options.some((o) => o.value === selected) ? selected : (options[0]?.value ?? 'me');

  if (options.length <= 1 && ownTracking) return <TodayView {...props} />;

  const followed = session.followed.find((fw) => fw.id === current);
  return (
    <div className="stack stack--lg">
      {options.length > 1 && (
        <div className="home-switcher">
          <Segmented label={t.partner.eyebrow} options={options} value={current} onChange={setSelected} />
        </div>
      )}
      {current === 'me' ? (
        <TodayView {...props} />
      ) : followed ? (
        <>
          <header className="page-header">
            <div>
              <p className="eyebrow">
                {t.partner.eyebrow} · {capitalize(f.longDate(today))}
              </p>
              <h1 className="display">{followed.data?.ownerName || t.sharing.pendingFollow}</h1>
            </div>
          </header>
          <PartnerView followed={followed} />
        </>
      ) : (
        <p className="muted partner-empty">{t.partner.noData}</p>
      )}
    </div>
  );
}
