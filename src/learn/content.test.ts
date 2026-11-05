import { describe, expect, it } from 'vitest';
import { ARTICLES, SECTIONS, SOURCE_LINKS } from './fi';

describe('learning content', () => {
  it('has unique article ids', () => {
    expect(new Set(ARTICLES.map((a) => a.id)).size).toBe(ARTICLES.length);
  });

  it('has articles in every section', () => {
    for (const section of Object.keys(SECTIONS)) expect(ARTICLES.some((a) => a.section === section), section).toBe(true);
  });

  it('links every source and cites at least one', () => {
    for (const a of ARTICLES) {
      expect(a.sources.length, a.id).toBeGreaterThan(0);
      for (const s of a.sources) expect(SOURCE_LINKS[s], `${a.id}: ${s}`).toMatch(/^https:\/\//);
    }
  });

  it('has no empty blocks', () => {
    for (const a of ARTICLES) {
      for (const b of a.blocks) {
        if (b.type === 'list') expect(b.items.length, a.id).toBeGreaterThan(0);
        else expect(b.text.trim(), a.id).not.toBe('');
      }
    }
  });
});
