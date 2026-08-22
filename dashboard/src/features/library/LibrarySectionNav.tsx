import type { CSSProperties } from 'react';
import { colors, radius, spacing } from '../../theme/tokens';

export function LibrarySectionNav({
  activeSection,
  onSectionChange,
  sections,
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
  sections: readonly string[];
}) {
  if (sections.length < 2) return null;

  return (
    <nav aria-label="Data sections" className="library-page__nav" style={styles.nav}>
      {sections.map((section) => (
        <button
          aria-current={section === activeSection ? 'page' : undefined}
          className={`library-page__nav-button${section === activeSection ? ' library-page__nav-button--active' : ''}`}
          key={section}
          onClick={() => onSectionChange(section)}
          type="button"
        >
          {labelize(section)}
        </button>
      ))}
    </nav>
  );
}

export function labelize(value: string) {
  const labels: Record<string, string> = {
    'machine-parameters': 'Parameters',
    'material-properties': 'Properties',
    'material-suppliers': 'Suppliers',
    'scoring-rules': 'Properties',
  };
  if (labels[value]) return labels[value];
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const styles: Record<string, CSSProperties> = {
  nav: {
    alignItems: 'center',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.space2,
    overflowX: 'auto',
    padding: spacing.space3,
    width: '100%',
  },
};
