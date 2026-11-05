import { PALETTE_NAMES, type PaletteName } from '../domain/types';
import { useI18n } from '../i18n';

/** Swatches rendered with each palette's own tokens (data-palette on the swatch scopes the variables). */
export function PalettePicker({ value, onChange }: { value: PaletteName; onChange: (p: PaletteName) => void }) {
  const { t } = useI18n();
  return (
    <div className="palette-picker" role="radiogroup" aria-label={t.settings.palette}>
      {PALETTE_NAMES.map((p) => (
        <button key={p} type="button" role="radio" aria-checked={value === p} className="palette-swatch" data-palette={p} onClick={() => onChange(p)}>
          <span className="palette-swatch__chip" aria-hidden>
            <span style={{ background: 'var(--accent)' }} />
            <span style={{ background: 'var(--period)' }} />
            <span style={{ background: 'var(--fertile)' }} />
          </span>
          <span className="palette-swatch__name">{t.settings.palettes[p]}</span>
        </button>
      ))}
    </div>
  );
}
