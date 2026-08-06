import { useEffect, useState } from 'react';
import { LibraryPage } from './LibraryPage';

interface MasterDataPageProps {
  initialSection: string;
  onImport?: () => void;
  sections: readonly string[];
}

export function MasterDataPage({ initialSection, onImport, sections }: MasterDataPageProps) {
  const [activeSection, setActiveSection] = useState(initialSection);

  useEffect(() => setActiveSection(initialSection), [initialSection]);

  return (
    <LibraryPage
      activeSection={activeSection}
      onImport={onImport}
      onSectionChange={setActiveSection}
      sectionOptions={sections}
      standalone
    />
  );
}
