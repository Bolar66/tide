import { Sheet } from '../../components/Sheet';
import type { ISODate } from '../../domain/dates';
import { capitalize, useI18n } from '../../i18n';
import { LogPanel } from './LogPanel';

export function DaySheet({ date, onClose }: { date: ISODate | null; onClose: () => void }) {
  const { f } = useI18n();
  return (
    <Sheet open={date !== null} onClose={onClose} title={date ? capitalize(f.longDate(date)) : ''}>
      {date && <LogPanel key={date} date={date} />}
    </Sheet>
  );
}
