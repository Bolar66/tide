import { Sheet } from '../../components/Sheet';
import type { ISODate } from '../../domain/dates';
import { capitalize, useI18n } from '../../i18n';
import { DayEditor } from './DayEditor';

export function DaySheet({ date, onClose }: { date: ISODate | null; onClose: () => void }) {
  const { f } = useI18n();
  return (
    <Sheet open={date !== null} onClose={onClose} title={date ? capitalize(f.longDate(date)) : ''}>
      {date && <DayEditor key={date} date={date} />}
    </Sheet>
  );
}
