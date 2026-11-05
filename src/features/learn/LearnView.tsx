import { useState, type CSSProperties, type ComponentType, type SVGProps } from 'react';
import { IconBook, IconChevronLeft, IconChevronRight, IconFlask, IconHeart, IconSprout } from '../../components/icons';
import { useI18n } from '../../i18n';
import { ARTICLES, SECTIONS } from '../../learn/fi';
import type { LearnSection } from '../../learn/types';
import { ArticleView } from './ArticleView';
import './learn.css';

const SECTION_ORDER: LearnSection[] = ['basics', 'young', 'partner', 'deeper'];
const ICONS: Record<LearnSection, ComponentType<SVGProps<SVGSVGElement>>> = {
  basics: IconBook,
  young: IconSprout,
  partner: IconHeart,
  deeper: IconFlask,
};

type View = { kind: 'home' } | { kind: 'section'; section: LearnSection } | { kind: 'article'; id: string; from: LearnSection };

export function LearnView() {
  const { t } = useI18n();
  const [view, setView] = useState<View>({ kind: 'home' });
  const go = (v: View) => {
    setView(v);
    window.scrollTo(0, 0);
  };

  if (view.kind === 'article') {
    const article = ARTICLES.find((a) => a.id === view.id);
    if (article) return <ArticleView article={article} onBack={() => go({ kind: 'section', section: view.from })} />;
  }

  if (view.kind === 'section') {
    const section = SECTIONS[view.section];
    const Icon = ICONS[view.section];
    return (
      <div className="stack stack--lg">
        <header className="learn-nav">
          <button type="button" className="icon-button icon-button--filled" onClick={() => go({ kind: 'home' })} aria-label={t.learn.back}>
            <IconChevronLeft />
          </button>
        </header>
        <section className={`learn-section-hero learn-section-hero--${view.section} enter`}>
          <span className="learn-section-hero__icon" aria-hidden>
            <Icon width={28} height={28} />
          </span>
          <h1 className="display learn-section-hero__title">{section.title}</h1>
          <p className="muted">{section.description}</p>
        </section>
        <ul className="list learn-articles">
          {ARTICLES.filter((a) => a.section === view.section).map((a) => (
            <li key={a.id}>
              <button type="button" className="list__row" onClick={() => go({ kind: 'article', id: a.id, from: view.section })}>
                <span className="list__text">
                  <span className="learn-articles__title">{a.title}</span>
                  <span className="list__sub">
                    {a.summary} · {t.learn.minutes(a.minutes)}
                  </span>
                </span>
                <IconChevronRight className="list__chevron" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="stack stack--lg">
      <header className="page-header">
        <div>
          <h1 className="display">{t.learn.title}</h1>
          <p className="page-header__sub muted">{t.learn.intro}</p>
        </div>
      </header>
      <div className="learn-grid">
        {SECTION_ORDER.map((key, i) => {
          const Icon = ICONS[key];
          const count = ARTICLES.filter((a) => a.section === key).length;
          return (
            <button
              key={key}
              type="button"
              className={`learn-card learn-card--${key} enter`}
              style={{ '--i': i } as CSSProperties}
              onClick={() => go({ kind: 'section', section: key })}
            >
              <span className="learn-card__icon" aria-hidden>
                <Icon width={24} height={24} />
              </span>
              <span className="learn-card__title display">{SECTIONS[key].title}</span>
              <span className="learn-card__desc">{SECTIONS[key].description}</span>
              <span className="learn-card__count">{t.learn.articles(count)}</span>
            </button>
          );
        })}
      </div>
      <p className="muted small learn-disclaimer">{t.learn.disclaimer}</p>
    </div>
  );
}
