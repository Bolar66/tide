import { describe, expect, it } from 'vitest';
import { calendarMarks } from './calendar';

describe('calendarMarks', () => {
  it('marks logged and predicted days, logged first', () => {
    const marks = calendarMarks(
      [{ id: 'a', start: '2026-11-01' }],
      [{ start: '2026-11-03', end: '2026-11-06' }],
      '2026-11-04',
    );
    expect(Object.fromEntries(marks)).toEqual({
      '2026-11-01': 'period',
      '2026-11-02': 'period',
      '2026-11-03': 'period',
      '2026-11-04': 'period',
      '2026-11-05': 'predicted',
      '2026-11-06': 'predicted',
    });
  });
});
