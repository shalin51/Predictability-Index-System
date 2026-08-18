import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';
import { colors, font, radius, spacing } from '../../../theme/tokens';

export interface LabResultCategorySection {
  content: ReactNode;
  count: number;
  id: string;
  label: string;
}

export function LabResultCategoryAccordion({
  defaultOpenId,
  sections,
}: {
  defaultOpenId?: string;
  sections: LabResultCategorySection[];
}) {
  const idPrefix = useId().replace(/:/g, '');
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? sections[0]?.id ?? null);

  return (
    <div style={styles.sections}>
      {sections.map((section) => {
        const expanded = openId === section.id;
        const panelId = `${idPrefix}-lab-result-category-${section.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
        return (
          <section key={section.id} style={styles.accordion}>
            <button
              aria-controls={panelId}
              aria-expanded={expanded}
              onClick={() => setOpenId(expanded ? null : section.id)}
              style={styles.summary}
              type="button"
            >
              <span style={styles.label}>
                <span aria-hidden="true" style={styles.chevron}>{expanded ? '▾' : '›'}</span>
                {section.label}
              </span>
              <span style={styles.count}>{section.count} {section.count === 1 ? 'result' : 'results'}</span>
            </button>
            {expanded && <div id={panelId} style={styles.content}>{section.content}</div>}
          </section>
        );
      })}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  accordion: { border: `1px solid ${colors.border}`, borderRadius: radius.md, overflow: 'hidden' },
  chevron: { display: 'inline-block', fontSize: font.size.h3, width: spacing.space4 },
  content: { borderTop: `1px solid ${colors.border}`, minWidth: 0, overflow: 'auto', padding: spacing.space4 },
  count: { color: colors.text.muted, fontSize: font.size.small, fontWeight: font.weight.normal },
  label: { alignItems: 'center', display: 'inline-flex', gap: spacing.space2 },
  sections: { display: 'grid', gap: spacing.space3 },
  summary: {
    alignItems: 'center',
    background: colors.surfaceMuted,
    border: 0,
    color: colors.text.primary,
    cursor: 'pointer',
    display: 'flex',
    fontFamily: 'inherit',
    fontSize: font.size.body,
    fontWeight: font.weight.semibold,
    justifyContent: 'space-between',
    padding: `${spacing.space3}px ${spacing.space4}px`,
    textAlign: 'left',
    width: '100%',
  },
};
