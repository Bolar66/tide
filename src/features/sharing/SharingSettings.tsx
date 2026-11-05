import { useState } from 'react';
import { IconChevronRight, IconHeart, IconPlus } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { Switch } from '../../components/Switch';
import { useI18n } from '../../i18n';
import { useSession, type OwnedShareView } from '../../session/context';
import { SHARE_SCOPES, type ShareScope } from '../../sharing/types';
import { useStore, useTide } from '../../store/context';
import { PushSettings } from './PushSettings';
import './sharing.css';

type View = { kind: 'invite' } | { kind: 'link'; link: string } | { kind: 'share'; id: string } | { kind: 'follow'; id: string };

export function SharingSettings() {
  const { t } = useI18n();
  const sh = t.sharing;
  const session = useSession();
  const store = useStore();
  const displayName = useTide((s) => s.settings.displayName ?? '');
  const [view, setView] = useState<View | null>(null);
  const close = () => setView(null);

  if (!session.account) {
    return (
      <section className="settings-section">
        <h2 className="section-label">{sh.section}</h2>
        <p className="muted small settings-note">{sh.needAccount}</p>
      </section>
    );
  }

  const share = view?.kind === 'share' ? session.shares.find((s) => s.id === view.id) : undefined;
  const followed = view?.kind === 'follow' ? session.followed.find((f) => f.id === view.id) : undefined;
  const shareName = (s: OwnedShareView) => (s.status === 'invited' ? sh.invitedName : (s.partnerName ?? sh.unknownPartner));

  return (
    <section className="settings-section">
      <h2 className="section-label">{sh.section}</h2>
      <p className="muted small settings-note">{sh.intro}</p>
      <ul className="list">
        {session.shares.map((s) => (
          <li key={s.id}>
            <button type="button" className="list__row" onClick={() => setView({ kind: 'share', id: s.id })}>
              <span className="list__icon">
                <IconHeart />
              </span>
              <span className="list__text">
                {shareName(s)}
                <span className={`list__sub share-status share-status--${s.status}`}>{sh.status[s.status]}</span>
              </span>
              <IconChevronRight className="list__chevron" />
            </button>
          </li>
        ))}
        {session.followed.map((f) => (
          <li key={f.id}>
            <button type="button" className="list__row" onClick={() => setView({ kind: 'follow', id: f.id })}>
              <span className="list__icon">
                <IconHeart />
              </span>
              <span className="list__text">
                {f.data?.ownerName || sh.following}
                <span className="list__sub">{f.status === 'active' ? sh.following : sh.pendingFollow}</span>
              </span>
              <IconChevronRight className="list__chevron" />
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="list__row" onClick={() => setView({ kind: 'invite' })}>
            <span className="list__icon">
              <IconPlus />
            </span>
            <span className="list__text">
              {sh.invite}
              <span className="list__sub">{sh.inviteHint}</span>
            </span>
            <IconChevronRight className="list__chevron" />
          </button>
        </li>
      </ul>
      <PushSettings />

      <Sheet open={view !== null} onClose={close} title={view?.kind === 'link' ? sh.linkTitle : view?.kind === 'invite' ? sh.invite : sh.section}>
        {view?.kind === 'invite' && (
          <InviteForm
            initialName={displayName}
            onCreate={async (name) => {
              store.updateSettings({ displayName: name });
              setView({ kind: 'link', link: await session.createInvite() });
            }}
          />
        )}
        {view?.kind === 'link' && <InviteLink link={view.link} />}
        {view?.kind === 'share' && share && <ShareDetail share={share} name={shareName(share)} onClosed={close} />}
        {view?.kind === 'follow' && followed && (
          <div className="stack">
            <p>
              <strong>{followed.data?.ownerName || sh.following}</strong>
            </p>
            <p className="muted">{followed.status === 'active' ? sh.following : sh.pendingFollow}</p>
            <button
              type="button"
              className="button button--danger"
              onClick={async () => {
                if (!window.confirm(sh.leaveConfirm(followed.data?.ownerName || ''))) return;
                await session.leaveShare(followed.id);
                close();
              }}
            >
              {sh.leave}
            </button>
          </div>
        )}
      </Sheet>
    </section>
  );
}

function InviteForm({ initialName, onCreate }: { initialName: string; onCreate: (name: string) => Promise<void> }) {
  const { t } = useI18n();
  const sh = t.sharing;
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onCreate(name.trim());
        } catch (err) {
          console.error(err);
          setError(t.account.errors.unknown as string);
          setBusy(false);
        }
      }}
    >
      <p className="muted">{sh.linkText}</p>
      <label className="field">
        {sh.yourName}
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" />
        <span className="muted small">{sh.yourNameHint}</span>
      </label>
      {error && <p className="error-text">{error}</p>}
      <button type="submit" className="button" disabled={busy || !name.trim()}>
        {sh.createLink}
      </button>
    </form>
  );
}

function InviteLink({ link }: { link: string }) {
  const { t } = useI18n();
  const sh = t.sharing;
  const [copied, setCopied] = useState(false);
  return (
    <div className="stack">
      <p className="muted">{sh.linkText}</p>
      <code className="invite-link">{link}</code>
      {'share' in navigator && (
        <button type="button" className="button" onClick={() => navigator.share({ url: link }).catch(() => undefined)}>
          {sh.shareLink}
        </button>
      )}
      <button
        type="button"
        className="button button--secondary"
        onClick={() => navigator.clipboard?.writeText(link).then(() => setCopied(true), () => setCopied(false))}
      >
        {copied ? sh.copied : sh.copyLink}
      </button>
    </div>
  );
}

function ShareDetail({ share, name, onClosed }: { share: OwnedShareView; name: string; onClosed: () => void }) {
  const { t } = useI18n();
  const sh = t.sharing;
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const toggle = (scope: ShareScope, on: boolean) =>
    session.setShareScopes(share.id, on ? [...share.scopes, scope] : share.scopes.filter((s) => s !== scope));
  const remove = async (confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    await session.removeShare(share.id);
    onClosed();
  };

  if (share.status === 'invited') {
    return (
      <div className="stack">
        <p className="muted">{sh.status.invited}</p>
        {share.link && <InviteLink link={share.link} />}
        <button type="button" className="button button--danger" disabled={busy} onClick={() => void remove()}>
          {sh.cancelInvite}
        </button>
      </div>
    );
  }

  if (share.status === 'pending') {
    return (
      <div className="stack">
        {share.partnerName ? (
          <>
            <h3 className="card__title">{sh.requestTitle(share.partnerName)}</h3>
            <p className="muted">{sh.requestText}</p>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await session.approveShare(share.id);
                setBusy(false);
              }}
            >
              {sh.approve}
            </button>
          </>
        ) : (
          <p className="error-text">{sh.unverified}</p>
        )}
        <button type="button" className="button button--danger" disabled={busy} onClick={() => void remove()}>
          {sh.reject}
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      <h3 className="card__title">{name}</h3>
      <h4 className="section-label">{sh.scopesTitle}</h4>
      <ul className="list">
        {SHARE_SCOPES.map((scope) => (
          <li key={scope}>
            <Switch
              label={sh.scopes[scope].label}
              hint={sh.scopes[scope].hint}
              checked={share.scopes.includes(scope)}
              onChange={(on) => toggle(scope, on)}
            />
          </li>
        ))}
      </ul>
      <p className="muted small">{sh.neverShared}</p>
      <button type="button" className="button button--danger" disabled={busy} onClick={() => void remove(sh.stopConfirm(name))}>
        {sh.stop}
      </button>
    </div>
  );
}
