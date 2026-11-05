import { useState } from 'react';
import { IconHeart } from '../../components/icons';
import { useI18n } from '../../i18n';
import { useSession } from '../../session/context';
import { useTide } from '../../store/context';
import { AccountForm } from '../account/AccountForm';
import './sharing.css';

interface Props {
  shareId: string;
  secret: string;
  onDone: () => void;
}

/** Opened from an invite link: account (if needed) → name → request to join. */
export function JoinView({ shareId, secret, onDone }: Props) {
  const { t } = useI18n();
  const sh = t.sharing;
  const session = useSession();
  const savedName = useTide((s) => s.settings.displayName ?? '');
  const [mode, setMode] = useState<'create' | 'signin'>('create');
  const [name, setName] = useState(savedName);
  const [state, setState] = useState<'form' | 'busy' | 'done' | 'invalid'>('form');

  return (
    <main className="join">
      <span className="join__icon" aria-hidden>
        <IconHeart width={32} height={32} />
      </span>

      {state === 'done' ? (
        <>
          <h1 className="display join__title">{sh.joinedTitle}</h1>
          <p className="muted">{sh.joinedText}</p>
          <button type="button" className="button" onClick={onDone}>
            {sh.openApp}
          </button>
        </>
      ) : state === 'invalid' ? (
        <>
          <h1 className="display join__title">{sh.joinTitle}</h1>
          <p className="error-text">{sh.inviteInvalid}</p>
          <button type="button" className="button" onClick={onDone}>
            {sh.openApp}
          </button>
        </>
      ) : (
        <>
          <h1 className="display join__title">{sh.joinTitle}</h1>
          <p className="muted">{sh.joinText}</p>
          {!session.account ? (
            <>
              <p>{sh.joinAccount}</p>
              <AccountForm key={mode} mode={mode} onSwitch={() => setMode(mode === 'create' ? 'signin' : 'create')} onDone={() => undefined} />
            </>
          ) : (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setState('busy');
                try {
                  await session.joinShare(shareId, secret, name.trim());
                  setState('done');
                } catch (err) {
                  console.error(err);
                  setState('invalid');
                }
              }}
            >
              <label className="field">
                {sh.yourName}
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" />
                <span className="muted small">{sh.yourNameHint}</span>
              </label>
              <button type="submit" className="button" disabled={state === 'busy' || !name.trim()}>
                {state === 'busy' ? sh.joining : sh.join}
              </button>
            </form>
          )}
          <button type="button" className="button button--ghost" onClick={onDone}>
            {sh.cancel}
          </button>
        </>
      )}
    </main>
  );
}
