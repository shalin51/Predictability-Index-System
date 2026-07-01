import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { DashboardPage } from '../../components/ui/Page';
import { controlStyles } from '../../components/ui/controls';
import { colors, font, radius, spacing, type ThemeName } from '../../theme/tokens';
import type {
  DashboardPreferences,
  SettingsLandingView,
} from '../../app/dashboardPreferences';

interface SettingsPageProps {
  onSave: (next: { preferences: DashboardPreferences; theme: ThemeName }) => Promise<void> | void;
  preferences: DashboardPreferences;
  theme: ThemeName;
  themeOptions: Array<{ id: ThemeName; label: string; description: string }>;
}

export function SettingsPage({
  onSave,
  preferences,
  theme,
  themeOptions,
}: SettingsPageProps) {
  const [draftPreferences, setDraftPreferences] = useState(preferences);
  const [draftTheme, setDraftTheme] = useState(theme);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const hasChanges = useMemo(
    () => draftTheme !== theme || JSON.stringify(draftPreferences) !== JSON.stringify(preferences),
    [draftPreferences, draftTheme, preferences, theme],
  );

  useEffect(() => {
    setDraftPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    setDraftTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (hasChanges && submitState === 'saved') {
      setSubmitState('idle');
    }
  }, [hasChanges, submitState]);

  const handleSave = async () => {
    if (!hasChanges || submitState === 'saving') {
      return;
    }

    setSubmitState('saving');

    try {
      await onSave({ preferences: draftPreferences, theme: draftTheme });
      setSubmitState('saved');
    } catch (_error) {
      setSubmitState('idle');
    }
  };

  return (
    <DashboardPage maxWidth={1200}>
      <Card style={styles.card}>
        <section style={styles.section}>
          <div>
            <h1 style={styles.title}>Workspace settings</h1>
            <p style={styles.subtitle}>Tune the dashboard shell, landing view, and local alert behavior.</p>
          </div>

          <div style={styles.themeGrid}>
            {themeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setDraftTheme(option.id)}
                style={{
                  ...styles.themeCard,
                  ...(draftTheme === option.id ? styles.themeCardActive : {}),
                }}
                type="button"
              >
                <span style={styles.themeName}>{option.label}</span>
                <span style={styles.themeDescription}>{option.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Startup</h2>
          <div style={styles.fieldGrid}>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>Default landing view</span>
              <select
                onChange={(event) => setDraftPreferences({
                  ...draftPreferences,
                  defaultView: event.target.value as SettingsLandingView,
                })}
                style={styles.select}
                value={draftPreferences.defaultView}
              >
                <option value="dashboard">Dashboard</option>
                <option value="formulations">Formulations</option>
                <option value="benchmarks">Benchmarks</option>
              </select>
            </label>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Behavior</h2>
          <div style={styles.toggleStack}>
            <ToggleRow
              checked={draftPreferences.autoRefresh}
              description="Recheck operational surfaces more aggressively."
              label="Auto-refresh widgets"
              onChange={(checked) => setDraftPreferences({ ...draftPreferences, autoRefresh: checked })}
            />
            <ToggleRow
              checked={draftPreferences.desktopAlerts}
              description="Keep notification badges visible for workflow issues."
              label="Desktop-style alerts"
              onChange={(checked) => setDraftPreferences({ ...draftPreferences, desktopAlerts: checked })}
            />
            <ToggleRow
              checked={draftPreferences.denseTables}
              description="Use tighter spacing for benchmark and results tables."
              label="Dense table spacing"
              onChange={(checked) => setDraftPreferences({ ...draftPreferences, denseTables: checked })}
            />
          </div>
        </section>

        <div style={styles.actions}>
          <button
            disabled={!hasChanges || submitState === 'saving'}
            onClick={() => void handleSave()}
            style={{
              ...controlStyles.primaryButton,
              ...styles.saveButton,
              ...(!hasChanges && submitState !== 'saving' ? styles.saveButtonDisabled : {}),
            }}
            type="button"
          >
            {submitState === 'saving' ? 'Saving...' : submitState === 'saved' && !hasChanges ? 'Saved' : 'Save'}
          </button>
        </div>
      </Card>
    </DashboardPage>
  );
}

function ToggleRow({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        ...styles.toggleRow,
        ...(checked ? styles.toggleRowActive : {}),
      }}
      type="button"
    >
      <span>
        <span style={styles.toggleLabel}>{label}</span>
        <span style={styles.toggleDescription}>{description}</span>
      </span>
      <span style={{ ...styles.toggleTrack, ...(checked ? styles.toggleTrackActive : {}) }}>
        <span style={{ ...styles.toggleThumb, ...(checked ? styles.toggleThumbActive : {}) }} />
      </span>
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xl,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  title: {
    color: colors.text.primary,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    margin: 0,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: font.size.md,
    lineHeight: 1.6,
    margin: `${spacing.sm}px 0 0`,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: font.size.lg,
    margin: 0,
  },
  themeGrid: {
    display: 'grid',
    gap: spacing.md,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  },
  themeCard: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    color: colors.text.primary,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    padding: spacing.md,
    textAlign: 'left',
  },
  themeCardActive: {
    backgroundColor: colors.accentSoft,
    border: `1px solid ${colors.accent}`,
  },
  themeName: {
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
  themeDescription: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    lineHeight: 1.5,
  },
  fieldGrid: {
    display: 'grid',
    gap: spacing.md,
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
  },
  saveButton: {
    fontWeight: font.weight.medium,
    minWidth: 112,
  },
  saveButtonDisabled: {
    cursor: 'default',
    opacity: 0.7,
  },
  select: {
    appearance: 'none',
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    color: colors.text.primary,
    padding: '12px 14px',
  },
  toggleStack: {
    display: 'grid',
    gap: spacing.md,
  },
  toggleRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    color: colors.text.primary,
    cursor: 'pointer',
    display: 'flex',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
    textAlign: 'left',
    width: '100%',
  },
  toggleRowActive: {
    backgroundColor: colors.accentSoft,
    border: `1px solid ${colors.borderStrong}`,
  },
  toggleLabel: {
    color: colors.text.primary,
    display: 'block',
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
  toggleDescription: {
    color: colors.text.secondary,
    display: 'block',
    fontSize: font.size.sm,
    lineHeight: 1.5,
    marginTop: 4,
  },
  toggleTrack: {
    backgroundColor: colors.surfaceMuted,
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: 999,
    display: 'flex',
    flexShrink: 0,
    height: 28,
    padding: 3,
    width: 52,
  },
  toggleTrackActive: {
    backgroundColor: colors.accent,
    border: `1px solid ${colors.accent}`,
  },
  toggleThumb: {
    backgroundColor: colors.text.primary,
    borderRadius: 999,
    height: 20,
    transition: 'transform 140ms ease',
    width: 20,
  },
  toggleThumbActive: {
    transform: 'translateX(22px)',
  },
};
