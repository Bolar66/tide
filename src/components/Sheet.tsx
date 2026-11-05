import { useEffect, useRef, useState, type ReactNode } from 'react';
import { prefersReducedMotion } from '../hooks/useReducedMotion';
import { useI18n } from '../i18n';
import { IconClose } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const CLOSE_MS = 250;

/** Bottom sheet built on <dialog>: focus trapping, Esc and backdrop closing come for free. */
export function Sheet({ open, onClose, title, children }: Props) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  // Keep the content mounted while the sheet slides away.
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let timer: number | undefined;
    if (open && !dialog.open) {
      dialog.classList.remove('is-closing');
      dialog.showModal();
      document.documentElement.classList.add('no-scroll');
    } else if (!open && dialog.open) {
      if (prefersReducedMotion()) {
        dialog.close();
      } else {
        dialog.classList.add('is-closing');
        timer = window.setTimeout(() => {
          dialog.classList.remove('is-closing');
          dialog.close();
        }, CLOSE_MS);
      }
    }
    if (!open) document.documentElement.classList.remove('no-scroll');
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => () => document.documentElement.classList.remove('no-scroll'), []);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onClose={() => {
        setShown(false);
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {(open || shown) && (
        <div className="sheet__inner">
          <div className="sheet__grabber" aria-hidden />
          <header className="sheet__header">
            <h2>{title}</h2>
            <button type="button" className="icon-button icon-button--filled" onClick={onClose} aria-label={t.common.close}>
              <IconClose width={20} height={20} />
            </button>
          </header>
          <div className="sheet__body">{children}</div>
        </div>
      )}
    </dialog>
  );
}
