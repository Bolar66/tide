import { IconChevronLeft, IconInfo, IconSparkle } from '../../components/icons';
import { useI18n } from '../../i18n';
import { SECTIONS, SOURCE_LINKS } from '../../learn/fi';
import type { Article } from '../../learn/types';

export function ArticleView({ article, onBack }: { article: Article; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <article className="stack stack--lg article">
      <header className="learn-nav">
        <button type="button" className="icon-button icon-button--filled" onClick={onBack} aria-label={t.learn.back}>
          <IconChevronLeft />
        </button>
      </header>
      <div className="article__head enter">
        <p className="eyebrow">
          {SECTIONS[article.section].title} · {t.learn.minutes(article.minutes)}
        </p>
        <h1 className="display article__title">{article.title}</h1>
        <p className="article__summary">{article.summary}</p>
      </div>

      <div className="article__body">
        {article.blocks.map((b, i) => {
          switch (b.type) {
            case 'p':
              return <p key={i}>{b.text}</p>;
            case 'h':
              return (
                <h2 key={i} className="article__h">
                  {b.text}
                </h2>
              );
            case 'list':
              return (
                <ul key={i} className="article__list">
                  {b.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              );
            case 'tip':
              return (
                <aside key={i} className="article__callout article__callout--tip">
                  <IconSparkle width={20} height={20} aria-hidden />
                  <div>
                    <strong>{t.learn.tip}</strong>
                    <p>{b.text}</p>
                  </div>
                </aside>
              );
            case 'care':
              return (
                <aside key={i} className="article__callout article__callout--care">
                  <IconInfo width={20} height={20} aria-hidden />
                  <div>
                    <strong>{t.learn.care}</strong>
                    <p>{b.text}</p>
                  </div>
                </aside>
              );
          }
        })}
      </div>

      <footer className="article__footer">
        <h2 className="section-label">{t.learn.sources}</h2>
        <ul className="article__sources">
          {article.sources.map((s) => (
            <li key={s}>
              {SOURCE_LINKS[s] ? (
                <a href={SOURCE_LINKS[s]} target="_blank" rel="noopener noreferrer">
                  {s}
                </a>
              ) : (
                s
              )}
            </li>
          ))}
        </ul>
        <p className="muted small">{t.learn.disclaimer}</p>
      </footer>
    </article>
  );
}
