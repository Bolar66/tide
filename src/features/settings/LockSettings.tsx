import { useState } from 'react';
import { IconChevronRight, IconFaceId, IconKey, IconLock } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { PIN_LENGTH } from '../../crypto/lock';
import { prfMaybeSupported } from '../../crypto/passkey';
import { useI18n } from '../../i18n';
import { useSession } from '../../session/context';
import { PinPad } from '../lock/PinPad';

/** Settings row for the PIN lock, opening the setup flow or the management sheet. */
export function LockSettings() {
  const { t } = useI18n();
  const session = useSession();
  // Fixed when the sheet opens: enabling the lock mid-flow must not swap the setup flow for the
  // management view before the recovery code has been shown.
  const [mode, setMode] = useState<'setup' | 'manage' | null>(null);
  const enabled = session.lock !== null;
  const close = () => setMode(null);

  return (
    <>
      <button type="button" className="list__row" onClick={() => setMode(enabled ? 'manage' : 'setup')}>
        <span className="list__icon">
          <IconLock />
        </span>
        <span className="list__text">
          {t.settings.lock}
          <span className="list__sub">{enabled ? t.settings.lockOn : t.settings.lockOff}</span>
        </span>
        <IconChevronRight className="list__chevron" />
      </button>
      <Sheet open={mode !== null} onClose={close} title={mode === 'manage' ? t.lock.manageTitle : t.lock.setupTitle}>
        {mode === 'setup' && <SetupLock onDone={close} />}
        {mode === 'manage' && <ManageLock onDone={close} />}
      </Sheet>
    </>
  );
}

type SetupStep =
  | { step: 'intro' }
  | { step: 'pin' }
  | { step: 'confirm'; first: string }
  | { step: 'working' }
  | { step: 'recovery'; code: string }
  | { step: 'faceid' }
  | { step: 'done'; note?: string };

function SetupLock({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const session = useSession();
  const [s, setS] = useState<SetupStep>({ step: 'intro' });
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);

  const afterRecovery = async () => setS((await prfMaybeSupported()) ? { step: 'faceid' } : { step: 'done' });

  switch (s.step) {
    case 'intro':
      return (
        <div className="stack">
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <p>{t.lock.setupIntro}</p>
          <ul className="lock-points">
            {t.lock.setupPoints.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <button type="button" className="button" onClick={() => setS({ step: 'pin' })}>
            {t.lock.setupStart}
          </button>
        </div>
      );
    case 'pin':
      return (
        <PinPad
          title={t.lock.newPin}
          length={PIN_LENGTH}
          error={error}
          errorKey={errorKey}
          onComplete={(first) => {
            setError(null);
            setS({ step: 'confirm', first });
          }}
        />
      );
    case 'confirm':
      return (
        <PinPad
          key="confirm"
          title={t.lock.confirmPin}
          length={PIN_LENGTH}
          onComplete={async (pin) => {
            if (pin !== s.first) {
              setError(t.lock.pinMismatch);
              setErrorKey((k) => k + 1);
              setS({ step: 'pin' });
              return;
            }
            setS({ step: 'working' });
            try {
              setS({ step: 'recovery', code: await session.enableLock(pin) });
            } catch (err) {
              console.error(err);
              setError(t.common.saveError);
              setS({ step: 'intro' });
            }
          }}
        />
      );
    case 'working':
      return <p className="muted lock-working">{t.lock.working}</p>;
    case 'recovery':
      return <RecoveryCode code={s.code} onContinue={() => void afterRecovery()} />;
    case 'faceid':
      return <FaceIdOffer onDone={(note) => setS({ step: 'done', note })} />;
    case 'done':
      return (
        <div className="stack">
          <p className="success-text">{t.lock.done}</p>
          {s.note && <p className="muted small">{s.note}</p>}
          <button type="button" className="button" onClick={onDone}>
            {t.common.close}
          </button>
        </div>
      );
  }
}

function FaceIdOffer({ onDone }: { onDone: (note?: string) => void }) {
  const { t } = useI18n();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  return (
    <div className="stack">
      <div className="lock-faceid-art" aria-hidden>
        <IconFaceId width={44} height={44} />
      </div>
      <h3 className="card__title">{t.lock.faceIdTitle}</h3>
      <p className="muted">{t.lock.faceIdText}</p>
      <button
        type="button"
        className="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await session.addPasskey();
            onDone();
          } catch {
            onDone(t.lock.faceIdUnavailable);
          }
        }}
      >
        {t.lock.faceIdEnable}
      </button>
      <button type="button" className="button button--ghost" onClick={() => onDone()}>
        {t.lock.faceIdSkip}
      </button>
    </div>
  );
}

/** Shows a fresh recovery code once and makes the user confirm they stored it. */
export function RecoveryCode({ code, onContinue }: { code: string; onContinue: () => void }) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="stack">
      <div className="lock-faceid-art" aria-hidden>
        <IconKey width={40} height={40} />
      </div>
      <h3 className="card__title">{t.lock.recoveryTitle}</h3>
      <p className="muted">{t.lock.recoveryText}</p>
      <code className="recovery-code" aria-label={code}>
        {code.split('-').map((group, i) => (
          <span key={i}>{group}</span>
        ))}
      </code>
      <div className="button-row">
        <button
          type="button"
          className="button button--secondary button--small"
          onClick={() =>
            navigator.clipboard?.writeText(code).then(
              () => setCopied(true),
              () => setCopied(false),
            )
          }
        >
          {copied ? t.lock.copied : t.lock.copy}
        </button>
        {'share' in navigator && (
          <button
            type="button"
            className="button button--secondary button--small"
            onClick={() => navigator.share({ text: code }).catch(() => undefined)}
          >
            {t.lock.share}
          </button>
        )}
      </div>
      <label className="checkbox">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        {t.lock.savedConfirm}
      </label>
      <button type="button" className="button" disabled={!saved} onClick={onContinue}>
        {t.common.next}
      </button>
    </div>
  );
}

type Action = 'change' | 'recovery' | 'disable';
type ManageView =
  | { view: 'menu'; message?: string }
  | { view: 'verify'; action: Action }
  | { view: 'newPin' }
  | { view: 'confirmNew'; first: string }
  | { view: 'recovery'; code: string };

function ManageLock({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const session = useSession();
  const [v, setV] = useState<ManageView>({ view: 'menu' });
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const fail = (msg: string) => {
    setError(msg);
    setErrorKey((k) => k + 1);
  };

  const afterVerify = async (action: Action) => {
    setError(null);
    if (action === 'change') return setV({ view: 'newPin' });
    if (action === 'recovery') return setV({ view: 'recovery', code: await session.regenerateRecovery() });
    await session.disableLock();
    onDone();
  };

  switch (v.view) {
    case 'verify':
      return (
        <PinPad
          title={t.lock.currentPin}
          length={PIN_LENGTH}
          error={error}
          errorKey={errorKey}
          disabled={busy}
          onComplete={async (pin) => {
            setBusy(true);
            const ok = await session.verifyPin(pin);
            setBusy(false);
            if (ok) await afterVerify(v.action);
            else fail(t.lock.wrongPin);
          }}
        />
      );
    case 'newPin':
      return (
        <PinPad
          key="new"
          title={t.lock.newPin}
          length={PIN_LENGTH}
          error={error}
          errorKey={errorKey}
          onComplete={(first) => {
            setError(null);
            setV({ view: 'confirmNew', first });
          }}
        />
      );
    case 'confirmNew':
      return (
        <PinPad
          key="confirm"
          title={t.lock.confirmPin}
          length={PIN_LENGTH}
          disabled={busy}
          onComplete={async (pin) => {
            if (pin !== v.first) {
              fail(t.lock.pinMismatch);
              return setV({ view: 'newPin' });
            }
            setBusy(true);
            await session.changePin(pin);
            setBusy(false);
            setV({ view: 'menu', message: t.lock.pinChanged });
          }}
        />
      );
    case 'recovery':
      return <RecoveryCode code={v.code} onContinue={() => setV({ view: 'menu' })} />;
    case 'menu':
      return (
        <div className="stack">
          {v.message && <p className="success-text">{v.message}</p>}
          <ul className="list">
            <li>
              <button type="button" className="list__row" onClick={() => setV({ view: 'verify', action: 'change' })}>
                <span className="list__text">{t.lock.changePin}</span>
                <IconChevronRight className="list__chevron" />
              </button>
            </li>
            <li>
              <button
                type="button"
                className="list__row"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    if (session.lock?.passkey) await session.removePasskey();
                    else await session.addPasskey();
                    setV({ view: 'menu' });
                  } catch {
                    setV({ view: 'menu', message: t.lock.faceIdUnavailable });
                  }
                  setBusy(false);
                }}
              >
                <span className="list__text">
                  {t.lock.faceIdRow}
                  <span className="list__sub">{session.lock?.passkey ? t.lock.faceIdOn : t.lock.faceIdOff}</span>
                </span>
                <span className="list__action">{session.lock?.passkey ? t.lock.faceIdRemove : t.lock.faceIdEnable}</span>
              </button>
            </li>
            <li>
              <button type="button" className="list__row" onClick={() => setV({ view: 'verify', action: 'recovery' })}>
                <span className="list__text">
                  {t.lock.newRecovery}
                  <span className="list__sub">{t.lock.newRecoveryHint}</span>
                </span>
                <IconChevronRight className="list__chevron" />
              </button>
            </li>
          </ul>
          <button type="button" className="button button--secondary" onClick={session.lockNow}>
            {t.lock.lockNow}
          </button>
          <button type="button" className="button button--danger" onClick={() => setV({ view: 'verify', action: 'disable' })}>
            {t.lock.disable}
          </button>
          <p className="muted small">{t.lock.disableHint}</p>
        </div>
      );
  }
}
