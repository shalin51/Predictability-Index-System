import type { LabResultCategorySection } from './LabResultCategoryAccordion';
import { LabResultCategoryAccordion } from './LabResultCategoryAccordion';

export type LabResultSampleSection = LabResultCategorySection;

export function LabResultSampleAccordion({ sections }: { sections: LabResultSampleSection[] }) {
  return <LabResultCategoryAccordion sections={sections} showBulkControls />;
}
