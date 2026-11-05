import { useState } from 'react';
import { IconChevronRight, IconCloudOff, IconLock } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { MIN_PASSWORD_LENGTH } from '../../account/config';
import { useI18n } from '../../i18n';
import { useNow } from '../../hooks/useNow';
import { useSession } from '../../session/context';
import { RecoveryCode } from '../settings/LockSettings';
import { AccountComparison, AccountForm } from './AccountForm';
import { syncLabel as label } from './syncLabel';
import './account.css';

type View =
  | { view: 'intro' }
  | { view: 'form'; mode: 'create' | 'signin' }
  | { view: 'recovery'; code: string }
  | { view: 'manage'; message?: string }
  | { view: 'password' };

export function AccountSettings() {
  const { t } = useI18n();
  const a = t.account;
  const session = useSession();
  const [view, setView] = useState<View | null>(null);
  const now = useNow();
  const syncLabel = label(session.sync, a, now);
  const signedIn = session.account !== null;
  const close = () => setView(null);

  return (
    <>
      <button type="button" className="list__row" onClick={() => setView(signedIn ? { view: 'manage' } : { view: 'intro' })}>
        <span className="list__icon">{signedIn ? <IconLock /> : <IconCloudOff />}</span>
        <span className="list__text">
          {a.row}
          <span className="list__sub">{signedIn ? `${session.account!.email} · ${syncLabel}` : a.rowOff}</span>
        </span>
        <IconChevronRight className="list__chevron" />
      </button>

      <Sheet open={view !== null} onClose={close} title={a.row}>
        {view?.view === 'intro' && (
          <div className="stack">
            <h3 className="card__title">{a.introTitle}</h3>
            <AccountComparison />
            <button type="button" className="button" onClick={() => setView({ view: 'form', mode: 'create' })}>
              {a.create}
            </button>
            <button type="button" className="button button--ghost" onClick={() => setView({ view: 'form', mode: 'signin' })}>
              {a.haveAccount}
            </button>
          </div>
        )}

        {view?.view === 'form' && (
          <AccountForm
            key={view.mode}
            mode={view.mode}
            onSwitch={() => setView({ view: 'form', mode: view.mode === 'create' ? 'signin' : 'create' })}
            onDone={(code) => setView(code ? { view: 'recovery', code } : { view: 'manage', message: view.mode === 'create' ? a.createdTitle : undefined })}
          />
        )}

        {view?.view === 'recovery' && <RecoveryCode code={view.code} onContinue={() => setView({ view: 'manage', message: a.createdTitle })} />}

        {view?.view === 'manage' && <ManageAccount message={view.message} onPassword={() => setView({ view: 'password' })} onClosed={close} />}

        {view?.view === 'password' && (
          <ChangePassword onDone={() => setView({ view: 'manage', message: a.passwordChanged })} />
        )}
      </Sheet>
    </>
  );
}

function ManageAccount({ message, onPassword, onClosed }: { message?: string; onPassword: () => void; onClosed: () => void }) {
  const { t } = useI18n();
  const a = t.account;
  const session = useSession();
  const now = useNow();
  const syncLabel = label(session.sync, a, now);
  const [busy, setBusy] = useState(false);
  if (!session.account) return null;

  return (
    <div className="stack">
      {message && <p className="success-text">{message}</p>}
      <div className="account-card">
        <span className="muted small">{a.signedInAs}</span>
        <strong>{session.account.email}</strong>
        <span className={`account-card__sync account-card__sync--${session.sync.state}`}>{syncLabel}</span>
      </div>
      <button
        type="button"
        className="button button--secondary"
        disabled={session.sync.state === 'syncing'}
        onClick={() => void session.syncNow()}
      >
        {a.syncNow}
      </button>
      <ul className="list">
        <li>
          <button type="button" className="list__row" onClick={onPassword}>
            <span className="list__text">{a.changePassword}</span>
            <IconChevronRight className="list__chevron" />
          </button>
        </li>
      </ul>
      <button
        type="button"
        className="button button--secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await session.signOut();
          onClosed();
        }}
      >
        {a.signOut}
      </button>
      <p className="muted small">{a.signOutHint}</p>
      <button
        type="button"
        className="button button--danger"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm(a.deleteConfirm)) return;
          setBusy(true);
          try {
            await session.deleteAccount();
            onClosed();
          } catch (err) {
            console.error(err);
            setBusy(false);
            window.alert(a.errors.unknown as string);
          }
        }}
      >
        {a.delete}
      </button>
    </div>
  );
}

function ChangePassword({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const a = t.account;
  const session = useSession();
  const [pw, setPw] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pw.length < MIN_PASSWORD_LENGTH) return setError((a.errors.short as (n: number) => string)(MIN_PASSWORD_LENGTH));
        if (pw !== repeat) return setError(a.errors.mismatch as string);
        setBusy(true);
        try {
          await session.changePassword(pw);
          onDone();
        } catch (err) {
          console.error(err);
          setError(a.errors.unknown as string);
          setBusy(false);
        }
      }}
    >
      <label className="field">
        {a.newPassword}
        <input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <span className="muted small account-form__hint">{a.passwordHint(MIN_PASSWORD_LENGTH)}</span>
      </label>
      <label className="field">
        {a.passwordRepeat}
        <input className="input" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
      </label>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="button" disabled={busy || !pw || !repeat}>
        {busy ? a.working : a.changePassword}
      </button>
    </form>
  );
}
