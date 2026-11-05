import { format, type Locale as DateLocale } from 'date-fns';
import { fromISO, type ISODate } from '../domain/dates';

export function createFormat(locale: DateLocale) {
  return {
    /** "torstai 5. marraskuuta" (standalone weekday, not the inflected "torstaina") */
    longDate: (d: ISODate) => format(fromISO(d), 'cccc d. MMMM', { locale }),
    /** "5.11." */
    shortDate: (d: ISODate) => format(fromISO(d), 'd.M.'),
    /** "5.11.2026" */
    fullDate: (d: ISODate) => format(fromISO(d), 'd.M.yyyy'),
    /** "marraskuu" */
    monthName: (d: Date) => format(d, 'LLLL', { locale }),
    /** "2026" */
    year: (d: Date) => format(d, 'yyyy'),
    /** "marraskuu 2026" */
    monthTitle: (d: Date) => format(d, 'LLLL yyyy', { locale }),
    /** "ma", "ti", … starting from Monday */
    weekdaysShort: () =>
      Array.from({ length: 7 }, (_, i) => format(new Date(2024, 0, 1 + i), 'cccccc', { locale })),
  };
}

export type Format = ReturnType<typeof createFormat>;

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
