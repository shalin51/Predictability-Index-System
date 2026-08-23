import type { CSSProperties } from 'react';
import { useState } from 'react';
import { Card, CardHeader, CardSubtitle, CardTitle, Divider } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import { downloadDataTransferWorkbook } from '../../services/api';
import { colors, font, radius, spacing } from '../../theme/tokens';

interface ExportTypeConfig {
  resource: string;
  title: string;
  description: string;
  group: string;
}

const EXPORT_TYPES: ExportTypeConfig[] = [
  { resource: 'material-suppliers', title: 'Material Suppliers', description: 'Export all supplier records.', group: 'Materials' },
  { resource: 'materials', title: 'Materials', description: 'Export all material records.', group: 'Materials' },
  { resource: 'material-properties', title: 'Material Properties', description: 'Export material property data.', group: 'Materials' },
  { resource: 'machines', title: 'Machines & Parameters', description: 'Export machines and parameter capabilities in a single file.', group: 'Equipment' },
  { resource: 'machine-setup-profiles', title: 'Machine Setup Profiles', description: 'Export predefined machine setup profiles.', group: 'Equipment' },
  { resource: 'molds', title: 'Molds & Zones', description: 'Export molds and zone definitions in a single file.', group: 'Equipment' },
  { resource: 'benchmarks', title: 'Benchmarks', description: 'Export benchmark profiles and properties in a single file.', group: 'Benchmarks' },
  { resource: 'scoring-profiles', title: 'Scoring Profiles', description: 'Export scoring profiles with metric weights.', group: 'Benchmarks' },
  { resource: 'formulations', title: 'Formulations', description: 'Export formulation recipes and components.', group: 'Workspace' },
  { resource: 'production-runs', title: 'Production Runs', description: 'Export production runs.', group: 'Workspace' },
  { resource: 'testing', title: 'Testing', description: 'Export ball test results.', group: 'Workspace' },
];

const GROUPS = ['Materials', 'Equipment', 'Benchmarks', 'Workspace'];

export function ExportsPage() {
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  const handleExport = async (resource: string) => {
    setBusy((prev) => ({ ...prev, [resource]: true }));
    setError('');
    try {
      await downloadDataTransferWorkbook(resource, 'export');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Export failed');
    } finally {
      setBusy((prev) => ({ ...prev, [resource]: false }));
    }
  };

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Exports</CardTitle>
            <CardSubtitle>
              Download current data as Excel files. Exported files use the same <code>import_*</code> tab structure as import templates — they can be re-imported directly.
              Filenames include a timestamp for version control.
            </CardSubtitle>
          </div>
        </CardHeader>
        <Divider />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        <div style={styles.groups}>
          {GROUPS.map((group) => (
            <div key={group} style={styles.group}>
              <h2 style={styles.groupTitle}>{group}</h2>
              <div style={styles.cards}>
                {EXPORT_TYPES.filter((t) => t.group === group).map((type) => (
                  <div key={type.resource} style={styles.card}>
                    <div style={styles.cardBody}>
                      <div style={styles.cardTitle}>{type.title}</div>
                      <div style={styles.cardDesc}>{type.description}</div>
                    </div>
                    <div style={styles.cardActions}>
                      <Button
                        disabled={busy[type.resource] ?? false}
                        onClick={() => void handleExport(type.resource)}
                        type="button"
                        variant="secondary"
                        size="sm"
                      >
                        {busy[type.resource] ? 'Exporting…' : '⬇ Export'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </DashboardPage>
  );
}

const styles: Record<string, CSSProperties> = {
  groups: { display: 'flex', flexDirection: 'column', gap: spacing.space6 },
  group: { display: 'flex', flexDirection: 'column', gap: spacing.space3 },
  groupTitle: { color: colors.text.secondary, fontSize: font.size.sm, fontWeight: font.weight.semibold, letterSpacing: '0.08em', margin: 0, textTransform: 'uppercase' },
  cards: { display: 'grid', gap: spacing.space3, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' },
  card: { background: colors.surfaceMuted, border: `1px solid ${colors.border}`, borderRadius: radius.md, display: 'flex', flexDirection: 'column', gap: spacing.space3, padding: spacing.space4 },
  cardBody: { flex: 1 },
  cardTitle: { color: colors.text.primary, fontSize: font.size.body, fontWeight: font.weight.semibold, marginBottom: spacing.space1 },
  cardDesc: { color: colors.text.muted, fontSize: font.size.sm },
  cardActions: { display: 'flex', justifyContent: 'flex-end' },
};
