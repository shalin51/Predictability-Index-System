import { LibraryPage } from './LibraryPage';
import { LibraryRecordDetailPage } from './LibraryRecordDetailPage';

interface MasterDataPageProps {
  activeSection: string;
  editRecordId?: string;
  onOpenRecord: (id: string) => void;
  onSectionChange: (section: string) => void;
  recordId?: string;
  sections: readonly string[];
}

export function MasterDataPage({ activeSection, editRecordId, onOpenRecord, onSectionChange, recordId, sections }: MasterDataPageProps) {
  if (recordId) {
    return (
      <LibraryRecordDetailPage
        id={recordId}
        initialEditing={editRecordId === recordId}
        onBack={() => onSectionChange(activeSection)}
        onSectionChange={onSectionChange}
        resource={activeSection}
        sections={sections}
      />
    );
  }

  return (
    <LibraryPage
      activeSection={activeSection}
      onOpenRecord={onOpenRecord}
      onSectionChange={onSectionChange}
      sectionOptions={sections}
      standalone
    />
  );
}
