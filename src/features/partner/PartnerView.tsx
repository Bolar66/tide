import { useMemo } from 'react';
import { diffDays } from '../../domain/dates';
import { deriveCycle } from '../../domain/cycleSummary';
import type { Scale5 } from '../../domain/types';
import { useNow } from '../../hooks/useNow';
import { useToday } from '../../hooks/useToday';
import { useI18n } from '../../i18n';
import type { FollowedView } from '../../session/context';
import { trackerById } from '../../trackers/registry';
import { PartnerConnectCard } from '../connect/ConnectCards';
import { CycleRing } from '../today/CycleRing';
import './partner.css';

const SYMPTOM_KEYS = ['mood', 'energy', 'cramps', 'headache'] as const;

/** A partner's shared cycle, computed on this device from the decrypted shared snapshot. */
export function PartnerView({ followed }: { followed: FollowedView }) {
  const { t, f } = useI18n();
  const today = useToday();
  const now = useNow();
  const data = followed.data;

  const cycle = useMemo(
    () =>
      data
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

  if (!data || !cycle) {
    return <p className="muted partner-empty">{followed.status === 'pending' ? t.partner.waiting : t.partner.noData}</p>;
  }

  const next = cycle.prediction.upcoming[0];
  const status = !data.scopes.includes('cycle')
    ? t.partner.noCycle
    : cycle.inPeriod
      ? t.ring.inPeriod(cycle.cycleDay ?? 1)
      : cycle.prediction.daysLate > 0
        ? t.ring.late(cycle.prediction.daysLate)
        : next
          ? t.ring.next(diffDays(next.start, today))
          : '';

  const tips = cycle.phase ? t.partner.tips[cycle.phase] : [];
  const tip = cycle.cycleDay ? tips[(cycle.cycleDay - 1) % tips.length] : tips[0];
  const entry = data.days.find((d) => d.date === today);
  const minutes = followed.fetchedAt ? Math.round((now - followed.fetchedAt) / 60_000) : null;

  const chips: string[] = [];
  if (entry?.flow) chips.push(`${t.partner.flow}: ${t.day.flowLevels[entry.flow]}`);
  for (const key of SYMPTOM_KEYS) {
    const v = entry?.symptoms?.[key];
    if (v) chips.push(`${t.symptoms[key].label}: ${t.symptoms[key].levels[v - 1]}`);
  }
  for (const [id, v] of Object.entries(entry?.metrics ?? {})) {
    const def = trackerById(id);
    const copy = t.trackers.items[id];
    if (!def || !copy) continue;
    if (def.kind === 'scale5' && typeof v === 'number') chips.push(`${copy.label}: ${copy.levels?.[(v as Scale5) - 1] ?? v}`);
    else if (def.kind === 'number' && typeof v === 'number') chips.push(`${copy.label}: ${String(v).replace('.', ',')} ${def.unit}`);
    else if (Array.isArray(v)) chips.push(`${copy.label}: ${v.map((o) => copy.options?.[o] ?? o).join(', ')}`);
  }

  return (
    <div className="stack stack--lg">
      {data.scopes.includes('cycle') && <CycleRing ring={cycle.ring} cycleLength={cycle.stats.avgCycle} status={status} />}
      {!data.scopes.includes('cycle') && <p className="muted">{status}</p>}

      {cycle.phase && data.scopes.includes('cycle') && (
        <section className={`card phase-card phase-card--${cycle.phase}`}>
          <p className="eyebrow">{t.phases.title}</p>
          <h2 className="card__title phase-card__name">{t.phases.names[cycle.phase]}</h2>
          <p className="phase-card__text">{t.phases.summaries[cycle.phase]}</p>
          {cycle.ovulation && (
            <p className="phase-card__ovulation">{t.phases.ovulationOn(f.weekdayDate(cycle.ovulation), diffDays(cycle.ovulation, today))}</p>
          )}
          {tip && (
            <div className="phase-card__tip">
              <div>
                <p className="phase-card__tip-title">{t.partner.tipsTitle}</p>
                <p>{tip}</p>
              </div>
            </div>
          )}
          {cycle.fertile.length > 0 && <p className="phase-card__note">{t.phases.fertileNote}</p>}
        </section>
      )}

      <section className="card">
        <h2 className="card__title">{t.partner.todayTitle}</h2>
        {chips.length === 0 ? (
          <p className="muted">{t.partner.nothingToday}</p>
        ) : (
          <ul className="partner-chips">
            {chips.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}
        {entry?.note && <p className="partner-note">“{entry.note}”</p>}
      </section>

      {followed.status === 'active' && <PartnerConnectCard shareId={followed.id} name={data.ownerName} />}

      {minutes !== null && (
        <p className="muted small partner-updated">
          {t.partner.updated(minutes < 1 ? t.account.justNow : t.account.minutesAgo(minutes))}
        </p>
      )}
    </div>
  );
}
