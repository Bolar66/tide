import type { Profile } from '../domain/profile';
import { useI18n } from '../i18n';
import { IconHeart, IconWave } from './icons';

const ICONS = { own: IconWave, follower: IconHeart } as const;

/** Two large choice cards for how the app is used. */
export function ProfilePicker({ value, onChange }: { value: Profile | null; onChange: (p: Profile) => void }) {
  const { t } = useI18n();
  return (
    <div className="profile-picker" role="radiogroup" aria-label={t.settings.profile}>
      {(['own', 'follower'] as const).map((p) => {
        const Icon = ICONS[p];
        return (
          <button key={p} type="button" role="radio" aria-checked={value === p} className="profile-card" onClick={() => onChange(p)}>
            <span className="profile-card__icon" aria-hidden>
              <Icon width={26} height={26} />
            </span>
            <span className="profile-card__text">
              <strong>{t.settings.profiles[p].title}</strong>
              <span>{t.settings.profiles[p].text}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
