export type LearnSection = 'basics' | 'young' | 'partner' | 'deeper';

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'list'; items: string[] }
  /** Highlighted practical advice. */
  | { type: 'tip'; text: string }
  /** When to seek care: shown with a distinct, calm warning style. */
  | { type: 'care'; text: string };

export interface Article {
  id: string;
  section: LearnSection;
  title: string;
  summary: string;
  minutes: number;
  blocks: Block[];
  /** Organisation names; the app only links to their front pages so links do not rot. */
  sources: string[];
}
