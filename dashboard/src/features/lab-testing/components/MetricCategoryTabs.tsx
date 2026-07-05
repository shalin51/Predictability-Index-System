import { getTabButtonStyle } from '../../../components/ui/controls';
import { LAB_TABS } from '../labTestingUi';

export function MetricCategoryTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {LAB_TABS.map((tab) => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={getTabButtonStyle(active === tab.id)} type="button">{tab.label}</button>
      ))}
    </div>
  );
}
