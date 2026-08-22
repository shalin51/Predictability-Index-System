import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { colors, font, radius, shadow, spacing } from '../../theme/tokens';
import { controlStyles } from './controls';

export interface DateRangeValue {
  from: string;
  to: string;
}

export function DateRangePicker({ label, onChange, value }: { label: string; onChange: (value: DateRangeValue) => void; value: DateRangeValue }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasValue = Boolean(value.from || value.to);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const setDate = (key: keyof DateRangeValue, nextValue: string) => {
    const next = { ...value, [key]: nextValue };
    if (next.from && next.to && next.from > next.to) {
      if (key === 'from') next.to = nextValue;
      else next.from = nextValue;
    }
    onChange(next);
  };

  const displayValue = value.from && value.to
    ? `${value.from} – ${value.to}`
    : value.from ? `From ${value.from}`
      : value.to ? `Through ${value.to}`
        : 'All dates';

  return (
    <div ref={containerRef} style={styles.container}>
      <span style={controlStyles.fieldLabel}>{label}</span>
      <button aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((current) => !current)} style={styles.trigger} type="button">
        <span>{displayValue}</span>
        <span aria-hidden="true" style={styles.calendar}>▣</span>
      </button>
      {open && (
        <div aria-label={`${label} date range`} role="dialog" style={styles.popover}>
          <label style={controlStyles.field}>
            <span style={controlStyles.fieldLabel}>From</span>
            <input max={value.to || undefined} onChange={(event) => setDate('from', event.target.value)} style={controlStyles.input} type="date" value={value.from} />
          </label>
          <label style={controlStyles.field}>
            <span style={controlStyles.fieldLabel}>To</span>
            <input min={value.from || undefined} onChange={(event) => setDate('to', event.target.value)} style={controlStyles.input} type="date" value={value.to} />
          </label>
          {hasValue && <button onClick={() => onChange({ from: '', to: '' })} style={controlStyles.linkButton} type="button">Clear dates</button>}
        </div>
      )}
    </div>
  );
}

const styles: Record<'container' | 'trigger' | 'calendar' | 'popover', CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.space2,
    minWidth: 220,
    position: 'relative',
  },
  trigger: {
    ...controlStyles.input,
    alignItems: 'center',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    minWidth: 220,
    textAlign: 'left',
  },
  calendar: {
    color: colors.text.secondary,
    fontSize: font.size.small,
  },
  popover: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: radius.md,
    boxShadow: shadow.md,
    display: 'grid',
    gap: spacing.space3,
    minWidth: 280,
    padding: spacing.space3,
    position: 'absolute',
    top: '100%',
    zIndex: 10,
  },
};
