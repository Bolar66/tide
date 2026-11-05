import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
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

  // Drag the top of the sheet (grabber + title) down to close it.
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const onPointerDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    ref.current?.classList.add('is-dragging');
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    const dialog = ref.current;
    if (!d || !dialog) return;
    d.dy = Math.max(0, e.clientY - d.y);
    dialog.style.transform = `translateY(${d.dy}px)`;
  };
  const onPointerUp = () => {
    const d = drag.current;
    const dialog = ref.current;
    drag.current = null;
    if (!d || !dialog) return;
    dialog.classList.remove('is-dragging');
    const velocity = d.dy / Math.max(1, performance.now() - d.t);
    if (d.dy > 110 || (d.dy > 30 && velocity > 0.6)) {
      onClose();
      // The closing animation starts from where the finger left the sheet.
      window.setTimeout(() => (dialog.style.transform = ''), CLOSE_MS + 50);
    } else {
      dialog.style.transform = '';
    }
  };

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
          <div
            className="sheet__drag"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="sheet__grabber" aria-hidden />
            <header className="sheet__header">
            <h2>{title}</h2>
            <button type="button" className="icon-button icon-button--filled" onClick={onClose} aria-label={t.common.close}>
              <IconClose width={20} height={20} />
            </button>
            </header>
          </div>
          <div className="sheet__body">{children}</div>
        </div>
      )}
    </dialog>
  );
}
