import type { CSSProperties } from 'react';
import { colors, font, spacing } from '../../../theme/tokens';

export interface SetupProfileParameter {
  category?: string;
  displayName?: string;
  positionLabel?: string;
  scope?: string;
  unit?: string;
  value?: string | number | null;
}

export function SetupProfileParametersTable({ parameters }: { parameters?: SetupProfileParameter[] | null }) {
  if (!parameters?.length) return <div style={styles.empty}>No setup values are assigned to this profile.</div>;

  const groups = parameters.reduce<Map<string, SetupProfileParameter[]>>((result, parameter) => {
    const scope = parameter.scope === 'mold' ? 'Mold' : 'Machine';
    const category = parameter.category ?? 'Other';
    const key = `${scope}|${category}`;
    result.set(key, [...(result.get(key) ?? []), parameter]);
    return result;
  }, new Map());

  return (
    <div style={styles.groups}>
      {[...groups.entries()].map(([key, values]) => {
        const [scope, category] = key.split('|');
        return (
          <section key={key} style={styles.section}>
            <h3 style={styles.heading}>{scope} · {category}</h3>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead><tr><th style={styles.header}>Parameter</th><th style={styles.header}>Position / Zone</th><th style={styles.header}>Setpoint</th><th style={styles.header}>Unit</th></tr></thead>
                <tbody>{values.map((parameter, index) => <tr key={`${parameter.displayName}-${parameter.positionLabel}-${index}`}>
                  <td style={styles.cell}>{parameter.displayName ?? '-'}</td><td style={styles.cell}>{parameter.positionLabel ?? '-'}</td><td style={styles.cell}>{parameter.value ?? '-'}</td><td style={styles.cell}>{parameter.unit ?? '-'}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  cell: { borderTop: `1px solid ${colors.border}`, padding: `${spacing.space2} ${spacing.space3}`, textAlign: 'left' },
  empty: { color: colors.text.muted },
  groups: { display: 'grid', gap: spacing.space4 },
  heading: { color: colors.text.primary, fontSize: font.size.body, margin: 0 },
  header: { background: colors.surfaceMuted, color: colors.text.muted, fontSize: font.size.small, fontWeight: 600, padding: `${spacing.space2} ${spacing.space3}`, textAlign: 'left' },
  section: { display: 'grid', gap: spacing.space2 },
  table: { borderCollapse: 'collapse', minWidth: 580, width: '100%' },
  tableWrap: { border: `1px solid ${colors.border}`, borderRadius: 8, overflowX: 'auto' },
};
