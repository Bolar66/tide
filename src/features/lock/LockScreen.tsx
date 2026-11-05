import { Logo } from '../../components/Logo';
import { useEffect, useState } from 'react';
import { IconFaceId } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import * as lock from '../../crypto/lock';
import type { TideDB } from '../../db/db';
import { storedPalette, storedTheme, useTheme } from '../../hooks/useTheme';
import { useI18n } from '../../i18n';
import { PinPad } from './PinPad';

interface Props {
  db: TideDB;
  config: lock.LockConfig;
  onUnlock: (master: Uint8Array<ArrayBuffer>, config: lock.LockConfig) => void;
}

type Mode = { kind: 'pin' } | { kind: 'newPin'; master: Uint8Array<ArrayBuffer> } | { kind: 'confirmPin'; master: Uint8Array<ArrayBuffer>; first: string };

export function LockScreen({ db, config, onUnlock }: Props) {
  const { t } = useI18n();
  useTheme(storedTheme(), storedPalette());
  const [mode, setMode] = useState<Mode>({ kind: 'pin' });
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [forgotOpen, setForgotOpen] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    lock.readAttempts(db).then((a) => setBlockedUntil(a.blockedUntil));
  }, [db]);

  // Tick while blocked, to count down and re-enable the keypad.
  useEffect(() => {
    if (blockedUntil <= now) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [blockedUntil, now]);

  const blockedFor = Math.ceil((blockedUntil - now) / 1000);
  const fail = (message: string) => {
    setError(message);
    setErrorKey((k) => k + 1);
  };

  const submitPin = async (pin: string) => {
    if (mode.kind === 'newPin') {
      setError(null);
      setMode({ kind: 'confirmPin', master: mode.master, first: pin });
      return;
    }
    if (mode.kind === 'confirmPin') {
      if (pin !== mode.first) {
        fail(t.lock.pinMismatch);
        setMode({ kind: 'newPin', master: mode.master });
        return;
      }
      setBusy(true);
      const updated = await lock.changePin(db, config, mode.master, pin);
      onUnlock(mode.master, updated);
      return;
    }
    if (blockedFor > 0) return;
    setBusy(true);
    const master = await lock.unlockWithPin(config, pin);
    if (master) {
      await lock.resetAttempts(db);
      onUnlock(master, config);
      return;
    }
    const attempts = await lock.recordFailure(db);
    setBlockedUntil(attempts.blockedUntil);
    setNow(Date.now());
    setBusy(false);
    fail(t.lock.wrongPin);
  };

  const faceId = async () => {
    setBusy(true);
    try {
      const master = await lock.unlockWithPasskey(config);
      if (master) {
        await lock.resetAttempts(db);
        onUnlock(master, config);
        return;
      }
    } catch {
      /* cancelled or unsupported */
    }
    setBusy(false);
    setError(t.lock.faceIdFailed);
  };

  const recover = async () => {
    setBusy(true);
    const master = await lock.unlockWithRecovery(config, code);
    setBusy(false);
    if (!master) return setCodeError(t.lock.recoveryWrong);
    await lock.resetAttempts(db);
    setForgotOpen(false);
    setError(null);
    setMode({ kind: 'newPin', master });
  };

  const title =
    mode.kind === 'newPin' ? t.lock.newPin : mode.kind === 'confirmPin' ? t.lock.confirmPin : busy ? t.lock.unlocking : t.lock.enterPin;

  return (
    <main className="lock-screen">
      <header className="lock-screen__header">
        <Logo size={64} className="lock-screen__logo" />
        <h1 className="display lock-screen__title">{t.lock.title}</h1>
      </header>

      <PinPad
        key={mode.kind}
        title={title}
        length={lock.PIN_LENGTH}
        onComplete={(pin) => void submitPin(pin)}
        error={blockedFor > 0 && mode.kind === 'pin' ? t.lock.blocked(blockedFor) : error}
        errorKey={errorKey}
        disabled={busy || (blockedFor > 0 && mode.kind === 'pin')}
        extraKey={
          config.passkey && mode.kind === 'pin' ? (
            <button type="button" className="pinpad__key pinpad__key--ghost" onClick={() => void faceId()} aria-label={t.lock.faceId}>
              <IconFaceId width={30} height={30} />
            </button>
          ) : null
        }
      />

      {mode.kind === 'pin' && (
        <button type="button" className="button button--ghost button--small lock-screen__forgot" onClick={() => setForgotOpen(true)}>
          {t.lock.forgot}
        </button>
      )}

      <Sheet open={forgotOpen} onClose={() => setForgotOpen(false)} title={t.lock.forgotTitle}>
        <div className="stack">
          <p className="muted">{t.lock.forgotText}</p>
          {config.passkey && <p className="muted small">{t.lock.forgotFaceId}</p>}
          <label className="field">
            {t.lock.recoveryLabel}
            <input
              className="input lock-screen__code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setCodeError(null);
              }}
              placeholder={t.lock.recoveryPlaceholder}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          {codeError && (
            <p className="error-text" role="alert">
              {codeError}
            </p>
          )}
          <button type="button" className="button" onClick={() => void recover()} disabled={busy || code.trim().length < 24}>
            {t.lock.useRecovery}
          </button>
        </div>
      </Sheet>
    </main>
  );
}
