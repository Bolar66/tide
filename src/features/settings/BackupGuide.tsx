import { IconCloudOff, IconExport, IconLock } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { useI18n } from '../../i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Runs the export from the guide's own button, so the tap counts as the user gesture iOS needs. */
  onBackup: () => void;
}

export function BackupGuide({ open, onClose, onBackup }: Props) {
  const { t } = useI18n();
  const g = t.backupGuide;
  return (
    <Sheet open={open} onClose={onClose} title={g.title}>
      <div className="backup-guide">
        <p>{g.intro}</p>

        <section>
          <h3 className="section-label">{g.stepsTitle}</h3>
          <ol className="backup-guide__steps">
            {g.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="muted small">{g.otherDevices}</p>
        </section>

        <section>
          <h3 className="section-label">{g.whereTitle}</h3>
          <ul className="backup-guide__cards">
            {g.good.map((item) => (
              <li key={item.title} className="backup-guide__card backup-guide__card--good">
                <IconExport width={20} height={20} aria-hidden />
                <span>
                  <strong>{item.title}</strong>
                  <span className="muted">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="section-label">{g.avoidTitle}</h3>
          <ul className="backup-guide__cards">
            {g.avoid.map((line) => (
              <li key={line} className="backup-guide__card backup-guide__card--avoid">
                <IconCloudOff width={20} height={20} aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="section-label">{g.securityTitle}</h3>
          <ul className="backup-guide__cards">
            {g.security.map((line) => (
              <li key={line} className="backup-guide__card">
                <IconLock width={20} height={20} aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="section-label">{g.howOftenTitle}</h3>
          <p>{g.howOften}</p>
        </section>

        <section>
          <h3 className="section-label">{g.restoreTitle}</h3>
          <p>{g.restore}</p>
        </section>

        <button type="button" className="button backup-guide__action" onClick={onBackup}>
          {g.action}
        </button>
      </div>
    </Sheet>
  );
}
