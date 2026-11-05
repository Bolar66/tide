import { Sheet } from '../../components/Sheet';
import type { ISODate } from '../../domain/dates';
import { capitalize, longDate } from '../../i18n/fi';
import { DayEditor } from './DayEditor';

export function DaySheet({ date, onClose }: { date: ISODate | null; onClose: () => void }) {
  return (
    <Sheet open={date !== null} onClose={onClose} title={date ? capitalize(longDate(date)) : ''}>
      {date && <DayEditor key={date} date={date} />}
    </Sheet>
  );
}
