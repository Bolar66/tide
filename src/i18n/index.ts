import { fi as fiDate } from 'date-fns/locale/fi';
import { useMemo } from 'react';
import { useTide } from '../store/context';
import { fi } from './fi';
import { createFormat } from './format';

export type Messages = typeof fi;

/** Add a locale by adding a messages file of type Messages and its date-fns locale here. */
export const LOCALES = {
  fi: { label: 'Suomi', messages: fi, date: fiDate },
} satisfies Record<string, { label: string; messages: Messages; date: unknown }>;

export type Locale = keyof typeof LOCALES;
export const DEFAULT_LOCALE: Locale = 'fi';

export function bundleFor(locale: Locale = DEFAULT_LOCALE) {
  const entry = LOCALES[locale] ?? LOCALES[DEFAULT_LOCALE];
  return { t: entry.messages, f: createFormat(entry.date) };
}

/** Messages (`t`) and date formatters (`f`) for the user's chosen language. */
export function useI18n() {
  const locale = useTide((s) => s.settings.locale);
  return useMemo(() => bundleFor(locale), [locale]);
}

export { capitalize } from './format';
