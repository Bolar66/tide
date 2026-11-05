import { useState } from 'react';
import { MIN_PASSWORD_LENGTH } from '../../account/config';
import { AccountError } from '../../account/service';
import { useI18n } from '../../i18n';
import { useSession } from '../../session/context';
import { AuthError } from '../../sync/remote';

interface Props {
  mode: 'create' | 'signin';
  /** Recovery code to show after creating an account (null when the PIN lock's code is reused). */
  onDone: (recoveryCode: string | null) => void;
  onSwitch: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AccountForm({ mode, onDone, onSwitch }: Props) {
  const { t } = useI18n();
  const a = t.account;
  const session = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const message = (key: string) => {
    const m = a.errors[key];
    return typeof m === 'function' ? m(MIN_PASSWORD_LENGTH) : (m ?? (a.errors.unknown as string));
  };

  const submit = async () => {
    if (!EMAIL_RE.test(email.trim())) return setError(message('email'));
    if (mode === 'create') {
      if (password.length < MIN_PASSWORD_LENGTH) return setError(message('short'));
      if (password !== repeat) return setError(message('mismatch'));
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') onDone(await session.createAccount(email, password));
      else {
        await session.signIn(email, password);
        onDone(null);
      }
    } catch (err) {
      console.error(err);
      setError(message(err instanceof AuthError || err instanceof AccountError ? err.code : 'unknown'));
      setBusy(false);
    }
  };

  const canSubmit = email && password && (mode === 'signin' || (repeat && understood));

  return (
    <form
      className="stack account-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label className="field">
        {a.email}
        <input
          className="input"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
      </label>
      <label className="field">
        {a.password}
        <input
          className="input"
          type="password"
          autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />
        {mode === 'create' && <span className="muted small account-form__hint">{a.passwordHint(MIN_PASSWORD_LENGTH)}</span>}
      </label>
      {mode === 'create' && (
        <>
          <label className="field">
            {a.passwordRepeat}
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="checkbox account-form__consent">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} disabled={busy} />
            {a.understand}
          </label>
        </>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="button" disabled={busy || !canSubmit}>
        {busy ? a.working : mode === 'create' ? a.create : a.signIn}
      </button>
      <button type="button" className="button button--ghost" onClick={onSwitch} disabled={busy}>
        {mode === 'create' ? a.haveAccount : a.noAccount}
      </button>
      {mode === 'signin' && <p className="muted small">{a.forgotText}</p>}
    </form>
  );
}

/** Side-by-side explanation of the two storage options. */
export function AccountComparison() {
  const { t } = useI18n();
  const a = t.account;
  return (
    <div className="account-compare">
      <section className="account-compare__card">
        <h3>{a.withoutTitle}</h3>
        <ul>
          {a.without.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>
      <section className="account-compare__card account-compare__card--with">
        <h3>{a.withTitle}</h3>
        <ul>
          {a.with.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
