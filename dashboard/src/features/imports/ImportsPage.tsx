import type { CSSProperties } from 'react';
import { Card, CardHeader, CardSubtitle, CardTitle, Divider } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DashboardPage } from '../../components/ui/Page';
import { colors, font, radius, spacing } from '../../theme/tokens';
import type { ImportResource } from '../../routing/dashboardRoute';

interface ImportTypeCard {
  resource: ImportResource;
  title: string;
  description: string;
  group: string;
  dependency?: string;
}

const IMPORT_TYPES: ImportTypeCard[] = [
  { resource: 'material-suppliers', title: 'Material Suppliers', description: 'Import supplier organizations.', group: 'Materials' },
  { resource: 'materials', title: 'Materials', description: 'Import material records (requires suppliers to exist).', group: 'Materials', dependency: 'material-suppliers' },
  { resource: 'material-properties', title: 'Material Properties', description: 'Import material property data for existing materials.', group: 'Materials', dependency: 'materials' },
  { resource: 'machines', title: 'Machines', description: 'Import machines and their parameter capabilities in a single file.', group: 'Equipment' },
  { resource: 'machine-setup-profiles', title: 'Machine Setup Profiles', description: 'Import predefined machine setup profiles (requires machines to exist).', group: 'Equipment', dependency: 'machines' },
  { resource: 'molds', title: 'Molds', description: 'Import molds and zone definitions in a single file.', group: 'Equipment' },
  { resource: 'benchmarks', title: 'Benchmarks', description: 'Import benchmark profiles and properties in a single file.', group: 'Benchmarks' },
  { resource: 'scoring-profiles', title: 'Scoring Profiles', description: 'Import scoring profiles with metric weights.', group: 'Benchmarks', dependency: 'benchmarks' },
  { resource: 'formulations', title: 'Formulations', description: 'Import formulation recipes and components in a single file.', group: 'Workspace' },
  { resource: 'production-runs', title: 'Production Runs', description: 'Import production run data.', group: 'Workspace' },
  { resource: 'testing', title: 'Testing', description: 'Import ball test results (requires production runs to exist).', group: 'Workspace', dependency: 'production-runs' },
];

const GROUPS = ['Materials', 'Equipment', 'Benchmarks', 'Workspace'];

interface ImportsPageProps {
  onSelectResource: (resource: ImportResource) => void;
}

export function ImportsPage({ onSelectResource }: ImportsPageProps) {
  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Imports</CardTitle>
            <CardSubtitle>Select an import type to upload data from an Excel template. Download the template, fill it out, then validate and commit your data.</CardSubtitle>
          </div>
        </CardHeader>
        <Divider />
        <div style={styles.groups}>
          {GROUPS.map((group) => (
            <div key={group} style={styles.group}>
              <h2 style={styles.groupTitle}>{group}</h2>
              <div style={styles.cards}>
                {IMPORT_TYPES.filter((t) => t.group === group).map((type) => (
                  <div key={type.resource} style={styles.card}>
                    <div style={styles.cardBody}>
                      <div style={styles.cardTitle}>{type.title}</div>
                      <div style={styles.cardDesc}>{type.description}</div>
                      {type.dependency && (
                        <div style={styles.dep}>
                          ⚠ Requires <strong>{IMPORT_TYPES.find((t) => t.resource === type.dependency)?.title ?? type.dependency}</strong> to be imported first.
                        </div>
                      )}
                    </div>
                    <div style={styles.cardActions}>
                      <Button onClick={() => onSelectResource(type.resource)} type="button" variant="primary" size="sm">
                        Import
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
  dep: { background: colors.surfaceElevated, border: `1px solid ${colors.border}`, borderRadius: radius.sm, color: colors.text.secondary, fontSize: font.size.xs, marginTop: spacing.space2, padding: `${spacing.space1}px ${spacing.space2}px` },
};
