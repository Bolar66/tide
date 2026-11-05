import { useEffect, useState, type ReactNode } from 'react';
import { useI18n } from '../../i18n';
import './lock.css';

interface Props {
  title: string;
  length: number;
  onComplete: (pin: string) => void;
  /** Shown under the dots; a change in `errorKey` replays the shake animation and clears the input. */
  error?: string | null;
  errorKey?: number;
  disabled?: boolean;
  /** Left bottom key, e.g. a Face ID button. */
  extraKey?: ReactNode;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

/** Numeric keypad with dot indicators. Also accepts a hardware keyboard. */
export function PinPad({ title, length, onComplete, error, errorKey = 0, disabled, extraKey }: Props) {
  const { t } = useI18n();
  const [pin, setPin] = useState('');

  // Reset the input whenever a new error arrives. Adjusting state during render avoids an extra effect pass.
  const [seenErrorKey, setSeenErrorKey] = useState(errorKey);
  if (errorKey !== seenErrorKey) {
    setSeenErrorKey(errorKey);
    setPin('');
  }

  const press = (digit: string) => {
    if (disabled || pin.length >= length) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === length) onComplete(next);
  };
  const backspace = () => !disabled && setPin((p) => p.slice(0, -1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') backspace();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="pinpad">
      <p className="pinpad__title">{title}</p>
      <div
        key={errorKey}
        className={`pinpad__dots${error ? ' pinpad__dots--error' : ''}`}
        role="status"
        aria-label={t.lock.digits(pin.length, length)}
      >
        {Array.from({ length }, (_, i) => (
          <span key={i} className={i < pin.length ? 'is-filled' : ''} />
        ))}
      </div>
      <p className="pinpad__error" role="alert">
        {error ?? ''}
      </p>
      <div className="pinpad__keys">
        {KEYS.map((k) => (
          <button key={k} type="button" className="pinpad__key display" onClick={() => press(k)} disabled={disabled}>
            {k}
          </button>
        ))}
        <span className="pinpad__slot">{extraKey}</span>
        <button type="button" className="pinpad__key display" onClick={() => press('0')} disabled={disabled}>
          0
        </button>
        <button
          type="button"
          className="pinpad__key pinpad__key--ghost"
          onClick={backspace}
          disabled={disabled || pin.length === 0}
          aria-label={t.lock.delete}
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7 6-7Z" />
            <path d="m12 10 4 4M16 10l-4 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
