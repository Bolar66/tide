import { Logo } from '../../components/Logo';
import type { CSSProperties } from 'react';
import { IconChevronLeft } from '../../components/icons';
import { BRAND } from '../../brand';
import { useI18n } from '../../i18n';
import './about.css';

/** Runtime dependencies shipped in the app bundle, with their licences. */
const LICENSES = [
  { name: 'React', license: 'MIT' },
  { name: 'Dexie.js', license: 'Apache-2.0' },
  { name: 'date-fns', license: 'MIT' },
  { name: 'Workbox', license: 'MIT' },
  { name: 'Fraunces', license: 'SIL Open Font License 1.1' },
  { name: 'Inter', license: 'SIL Open Font License 1.1' },
];

export function AboutView({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  return (
    <div className="stack stack--lg">
      <header className="about-nav">
        <button type="button" className="icon-button icon-button--filled" onClick={onBack} aria-label={t.common.back}>
          <IconChevronLeft />
        </button>
      </header>

      <section className="about-hero enter">
        <Logo size={88} className="about-hero__logo" />
        <h1 className="display about-hero__name">{BRAND.name}</h1>
        <p className="muted">{t.about.tagline}</p>
        <p className="small muted">{t.about.version(__APP_VERSION__)}</p>
      </section>

      <section className="card enter" style={{ '--i': 1 } as CSSProperties}>
        <h2 className="card__title">{t.about.privacyTitle}</h2>
        <ul className="about-list">
          {t.about.privacy.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="card enter" style={{ '--i': 2 } as CSSProperties}>
        <h2 className="card__title">{t.about.healthTitle}</h2>
        <ul className="about-list">
          {t.about.health.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="card enter" style={{ '--i': 3 } as CSSProperties}>
        <h2 className="card__title">{t.about.licensesTitle}</h2>
        <p className="muted small">{t.about.licensesIntro}</p>
        <dl className="about-licenses">
          {LICENSES.map((l) => (
            <div key={l.name}>
              <dt>{l.name}</dt>
              <dd>{l.license}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
