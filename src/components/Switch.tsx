interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}

/** iOS-style toggle row. The whole row is the hit target. */
export function Switch({ checked, onChange, label, hint }: Props) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="list__row switch-row" onClick={() => onChange(!checked)}>
      <span className="list__text">
        {label}
        {hint && <span className="list__sub">{hint}</span>}
      </span>
      <span className="switch" aria-hidden>
        <span className="switch__thumb" />
      </span>
    </button>
  );
}
