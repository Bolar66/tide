import { useState } from 'react';
import { IconBook } from '../../components/icons';
import { useToday } from '../../hooks/useToday';
import { capitalize, useI18n } from '../../i18n';
import { ARTICLES } from '../../learn/fi';
import { useSession } from '../../session/context';
import { useTide } from '../../store/context';
import { DayEditor } from '../day/DayEditor';
import { OPEN_ARTICLE_KEY } from '../learn/LearnView';
import { FollowedDetail, FollowedList } from './FollowedCards';

interface Props {
  onOpenLearn: () => void;
  onOpenTrackers: () => void;
}

/** Home for "Haluan ymmärtää ja pysyä mukana": people who share with you, own wellbeing, a daily read. */
export function FollowerHome({ onOpenLearn, onOpenTrackers }: Props) {
  const { t, f } = useI18n();
  const session = useSession();
  const today = useToday();
  const trackers = useTide((s) => s.settings.enabledTrackers);
  const [open, setOpen] = useState<string | null>(null);
  const selected = session.followed.find((x) => x.id === open);
  if (selected) return <FollowedDetail followed={selected} onBack={() => setOpen(null)} />;

  // A different article each day, partner-perspective ones first.
  const pool = [...ARTICLES.filter((a) => a.section === 'partner'), ...ARTICLES.filter((a) => a.section !== 'partner')];
  const dayNumber = Math.floor(Date.parse(today) / 86400_000);
  const article = pool[dayNumber % pool.length]!;

  return (
    <div className="stack stack--lg">
      <header className="page-header">
        <div>
          <p className="eyebrow">{capitalize(f.longDate(today))}</p>
          <h1 className="display">{t.followed.todayTitle}</h1>
        </div>
      </header>

      <FollowedList onOpen={setOpen} />

      <section className="card learn-teaser">
        <p className="eyebrow">
          <IconBook width={16} height={16} aria-hidden /> {t.followed.learnTitle}
        </p>
        <h2 className="card__title">{article.title}</h2>
        <p className="muted">{article.summary}</p>
        <button
          type="button"
          className="button button--secondary button--small"
          onClick={() => {
            try {
              sessionStorage.setItem(OPEN_ARTICLE_KEY, article.id);
            } catch {
              /* ignore */
            }
            onOpenLearn();
          }}
        >
          {t.followed.learnOpen}
        </button>
      </section>

      <section className="card">
        <h2 className="card__title">{t.followed.wellbeingTitle}</h2>
        {trackers.length === 0 && <p className="muted small">{t.followed.wellbeingHint}</p>}
        <DayEditor date={today} showPeriodActions={false} wellbeingOnly onChooseTrackers={onOpenTrackers} />
      </section>
    </div>
  );
}
