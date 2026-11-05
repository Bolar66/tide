import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '../i18n/fi';
import { IconClose } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Bottom sheet built on <dialog>: focus trapping, Esc and backdrop closing come for free. */
export function Sheet({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.classList.add('no-scroll');
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) document.documentElement.classList.remove('no-scroll');
  }, [open]);

  useEffect(() => () => document.documentElement.classList.remove('no-scroll'), []);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="sheet__inner">
          <header className="sheet__header">
            <h2>{title}</h2>
            <button type="button" className="icon-button" onClick={onClose} aria-label={t.common.close}>
              <IconClose />
            </button>
          </header>
          <div className="sheet__body">{children}</div>
        </div>
      )}
    </dialog>
  );
}
