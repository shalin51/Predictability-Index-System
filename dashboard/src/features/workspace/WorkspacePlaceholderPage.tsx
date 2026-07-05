import type { CSSProperties } from 'react';
import { Card } from '../../components/ui/Card';
import { DashboardPage } from '../../components/ui/Page';
import { colors, font, radius, spacing } from '../../theme/tokens';

interface WorkspacePlaceholderPageProps {
  description: string;
  highlights: readonly string[];
  title: string;
}

export function WorkspacePlaceholderPage({
  description,
  highlights,
  title,
}: WorkspacePlaceholderPageProps) {
  return (
    <DashboardPage maxWidth="100%">
      <div style={styles.layout}>
        <Card style={styles.heroCard}>
          <span style={styles.eyebrow}>Workspace</span>
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.description}>{description}</p>
        </Card>

        <Card>
          <h2 style={styles.sectionTitle}>Ready for implementation</h2>
          <div style={styles.highlightGrid}>
            {highlights.map((highlight) => (
              <div key={highlight} style={styles.highlightCard}>
                {highlight}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardPage>
  );
}

const styles: Record<string, CSSProperties> = {
  description: {
    color: colors.text.secondary,
    fontSize: font.size.body,
    lineHeight: 1.7,
    margin: 0,
    maxWidth: 720,
  },
  eyebrow: {
    color: colors.text.muted,
    fontSize: font.size.small,
    fontWeight: font.weight.semibold,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  heroCard: {
    backgroundColor: colors.surfaceElevated,
    gap: spacing.space3,
  },
  highlightCard: {
    backgroundColor: colors.surfaceMuted,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    color: colors.text.primary,
    fontSize: font.size.body,
    lineHeight: 1.6,
    padding: spacing.space5,
  },
  highlightGrid: {
    display: 'grid',
    gap: spacing.space4,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  },
  layout: {
    display: 'grid',
    gap: spacing.space6,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: font.size.h2,
    margin: 0,
  },
  title: {
    color: colors.text.primary,
    fontSize: font.size.h1,
    fontWeight: font.weight.bold,
    margin: 0,
  },
};
