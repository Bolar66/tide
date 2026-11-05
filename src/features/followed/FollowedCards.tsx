import { useMemo, useState, type CSSProperties } from 'react';
import { IconChevronLeft, IconChevronRight } from '../../components/icons';
import { deriveCycle } from '../../domain/cycleSummary';
import { diffDays } from '../../domain/dates';
import { useNow } from '../../hooks/useNow';
import { useToday } from '../../hooks/useToday';
import { useI18n } from '../../i18n';
import { useSession, type FollowedView } from '../../session/context';
import { ackedIds } from '../../sharing/messages';
import { PartnerView } from '../partner/PartnerView';
import './followed.css';

/** Full view of one person who shares with this user. */
export function FollowedDetail({ followed, onBack }: { followed: FollowedView; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <div className="stack stack--lg">
      <header className="followed-nav">
        <button type="button" className="icon-button icon-button--filled" onClick={onBack} aria-label={t.followed.back}>
          <IconChevronLeft />
        </button>
      </header>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t.partner.eyebrow}</p>
          <h1 className="display">{followed.data?.ownerName || t.sharing.pendingFollow}</h1>
        </div>
      </header>
      <PartnerView followed={followed} />
    </div>
  );
}

/** One summary card per person sharing with this user. */
export function FollowedList({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useI18n();
  const session = useSession();
  if (session.followed.length === 0) {
    return (
      <section className="card followed-empty">
        <p>{t.followed.empty}</p>
        <p className="muted small">{t.followed.emptyHint}</p>
      </section>
    );
  }
  return (
    <div className="stack">
      {session.followed.map((f, i) => (
        <FollowedCard key={f.id} followed={f} index={i} onOpen={() => onOpen(f.id)} />
      ))}
    </div>
  );
}

/** "Seuratut" tab for people who track their own cycle. */
export function FollowedTab() {
  const { t } = useI18n();
  const session = useSession();
  const [open, setOpen] = useState<string | null>(null);
  const selected = session.followed.find((f) => f.id === open);
  if (selected) return <FollowedDetail followed={selected} onBack={() => setOpen(null)} />;
  return (
    <div className="stack stack--lg">
      <header className="page-header">
        <h1 className="display">{t.followed.title}</h1>
      </header>
      <FollowedList onOpen={setOpen} />
    </div>
  );
}

function FollowedCard({ followed, index, onOpen }: { followed: FollowedView; index: number; onOpen: () => void }) {
  const { t } = useI18n();
  const session = useSession();
  const today = useToday();
  const now = useNow();
  const data = followed.data;
  const cycle = useMemo(
    () =>
      data && data.scopes.includes('cycle')
        ? deriveCycle({
            periods: data.periods,
            today,
            cycleHint: data.cycleLengthHint,
            periodHint: data.periodLengthHint,
            showFertility: data.scopes.includes('fertile'),
          })
        : null,
    [data, today],
  );

  const messages = session.messages.filter((m) => m.shareId === followed.id);
  const acked = ackedIds(messages);
  const pending = messages.filter((m) => !m.fromMe && m.body.type === 'need' && !acked.has(m.id) && now - Date.parse(m.createdAt) < 2 * 86400_000);

  // The one line that matters most today.
  let headline = followed.status === 'pending' ? t.partner.waiting : data ? '' : t.partner.noData;
  let highlight = false;
  if (cycle) {
    const next = cycle.prediction.upcoming[0];
    const inDays = next ? diffDays(next.start, today) : null;
    if (cycle.inPeriod) headline = t.ring.inPeriod(cycle.cycleDay ?? 1);
    else if (cycle.prediction.daysLate > 0) headline = t.ring.late(cycle.prediction.daysLate);
    else if (inDays !== null && inDays <= 2) {
      headline = t.followed.soon(t.inDays(inDays));
      highlight = true;
    } else if (cycle.phase) headline = t.phases.names[cycle.phase];
  } else if (data) headline = t.partner.noCycle;

  return (
    <button type="button" className={`followed-card enter${highlight ? ' followed-card--soon' : ''}`} style={{ '--i': index } as CSSProperties} onClick={onOpen}>
      <span className="followed-card__avatar" aria-hidden>
        {(data?.ownerName || '?').slice(0, 1).toUpperCase()}
      </span>
      <span className="followed-card__body">
        <span className="followed-card__name">{data?.ownerName || t.sharing.pendingFollow}</span>
        <span className="followed-card__headline">{headline}</span>
        <span className="followed-card__meta">
          {cycle?.cycleDay && t.followed.cycleDayOf(cycle.cycleDay, Math.max(cycle.stats.avgCycle, cycle.cycleDay))}
          {pending.length > 0 && <span className="followed-card__badge">{t.followed.pendingRequests(pending.length)}</span>}
        </span>
      </span>
      <IconChevronRight className="list__chevron" />
    </button>
  );
}
