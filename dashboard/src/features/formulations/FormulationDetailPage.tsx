import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  getFormulation,
  type FormulationDetail,
} from '../../services/api';
import { colors, font, radius, spacing } from '../../theme/tokens';

interface FormulationDetailPageProps {
  formulationId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
}

export function FormulationDetailPage({
  formulationId,
  onBack,
  onEdit,
}: FormulationDetailPageProps) {
  const [data, setData] = useState<FormulationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    void getFormulation(formulationId)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [formulationId]);

  return (
    <DashboardPage maxWidth={1200}>
      <Card>
        <div style={styles.header}>
          <button onClick={onBack} style={controlStyles.secondaryButton} type="button">
            Back
          </button>
          {data && (
            <div style={controlStyles.actionRow}>
              <button onClick={() => onEdit(data.id)} style={controlStyles.primaryButton} type="button">
                Edit
              </button>
            </div>
          )}
        </div>

        {loading && <div style={styles.muted}>Loading formulation...</div>}
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}

        {!loading && !error && data && (
          <>
            <h1 style={styles.title}>{data.formulationCode}</h1>
            <p style={styles.subtitle}>{data.producedDate ?? 'No production date'}</p>

            <Divider />

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Record</h2>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <tbody>
                    <TableRow label="Record ID" value={data.id} />
                    <TableRow label="Code" value={data.formulationCode} />
                    <TableRow label="Produced Date" value={data.producedDate ?? '—'} />
                  </tbody>
                </table>
              </div>
            </section>

            <Divider />

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Resin Components</h2>
              {data.resinComponents.length > 0 ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Component</th>
                        <th style={styles.th}>Percent</th>
                        <th style={styles.th}>Supplier</th>
                        <th style={styles.th}>Lot Number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.resinComponents.map((component) => (
                        <tr key={`${component.materialId}-${component.resinComponent}`} style={styles.tableRow}>
                          <td style={styles.tdStrong}>{component.resinComponent}</td>
                          <td style={styles.td}>{component.percentComposition}%</td>
                          <td style={styles.td}>{component.materialSupplier}</td>
                          <td style={styles.td}>{component.lotNumber ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={styles.body}>No resin components attached yet.</p>
              )}
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Manufacturing Data</h2>
              {data.manufacturingData ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <tbody>
                      <TableRow label="Mold Used" value={data.manufacturingData.moldUsed ?? '—'} />
                      <TableRow
                        label="Injection Pressure"
                        value={data.manufacturingData.injectionPressure != null ? String(data.manufacturingData.injectionPressure) : '—'}
                      />
                      <TableRow
                        label="Melt Temperature"
                        value={data.manufacturingData.meltTemperature != null ? String(data.manufacturingData.meltTemperature) : '—'}
                      />
                      <TableRow
                        label="Cooling Time"
                        value={data.manufacturingData.coolingTime != null ? String(data.manufacturingData.coolingTime) : '—'}
                      />
                      <TableRow
                        label="Cycle Time"
                        value={data.manufacturingData.cycleTime != null ? String(data.manufacturingData.cycleTime) : '—'}
                      />
                      <TableRow label="Machine Used" value={data.manufacturingData.machineUsed ?? '—'} />
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={styles.body}>No manufacturing data attached yet.</p>
              )}
            </section>
          </>
        )}
      </Card>
    </DashboardPage>
  );
}

function TableRow({ label, value }: { label: string; value: string }) {
  return (
    <tr style={styles.tableRow}>
      <th style={styles.th}>{label}</th>
      <td style={styles.td}>{value}</td>
    </tr>
  );
}

const styles: Record<string, CSSProperties> = {
  body: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    lineHeight: 1.6,
    margin: 0,
  },
  header: {
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  muted: {
    color: colors.text.muted,
    fontSize: font.size.sm,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: font.size.md,
    margin: 0,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: font.size.md,
    margin: 0,
  },
  title: {
    color: colors.text.primary,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    margin: `${spacing.md}px 0 4px`,
  },
  table: {
    borderCollapse: 'collapse',
    width: '100%',
  },
  tableRow: {
    borderBottom: `1px solid ${colors.border}`,
  },
  tableWrap: {
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    overflow: 'auto',
  },
  td: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    padding: `${spacing.sm}px ${spacing.md}px`,
    verticalAlign: 'top',
  },
  tdStrong: {
    color: colors.text.primary,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    padding: `${spacing.sm}px ${spacing.md}px`,
  },
  th: {
    backgroundColor: colors.surfaceElevated,
    color: colors.text.muted,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
    letterSpacing: '0.08em',
    padding: `${spacing.sm}px ${spacing.md}px`,
    textAlign: 'left',
    textTransform: 'uppercase',
    verticalAlign: 'top',
  },
};
