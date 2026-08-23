import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { controlStyles } from '../../components/ui/controls';
import type { FormulationComponentPayload, LibraryRecord } from '../../services/api';
import { colors, spacing } from '../../theme/tokens';
import { formatValue, formulationStyles, totalTone } from './formulationUi';

interface FormulationComponentsEditorProps {
  components: FormulationComponentPayload[];
  lots: LibraryRecord[];
  materials: LibraryRecord[];
  onChange: (components: FormulationComponentPayload[]) => void;
  readOnly?: boolean;
  suppliers: LibraryRecord[];
}

export function FormulationComponentsEditor({
  components,
  lots,
  materials,
  onChange,
  readOnly = false,
  suppliers,
}: FormulationComponentsEditorProps) {
  const [materialSearches, setMaterialSearches] = useState<string[]>([]);
  const total = components.reduce((sum, component) => sum + Number(component.percentComposition || 0), 0);
  const remaining = 100 - total;
  const warnings = components.flatMap((component, index) => {
    const lot = lots.find((item) => item.id === component.materialLotId);
    if (!lot || lot['status'] === 'active') return [];
    return [`Row ${index + 1}: selected material lot is inactive`];
  });

  const update = (index: number, patch: Partial<FormulationComponentPayload>) => {
    onChange(components.map((component, currentIndex) => currentIndex === index ? { ...component, ...patch } : component));
  };

  useEffect(() => {
    setMaterialSearches((current) => components.map((component, index) => {
      if (current[index] !== undefined) return current[index];
      return materialSearchValue(materials.find((item) => item.id === component.materialId));
    }));
  }, [components, materials]);

  const selectMaterial = (index: number, value: string) => {
    setMaterialSearches((current) => current.map((search, currentIndex) => currentIndex === index ? value : search));
    const material = materials.find((item) => materialSearchValue(item) === value);
    if (material) update(index, { materialId: material.id, materialLotId: '', supplierId: '' });
    if (!value) update(index, { materialId: '', materialLotId: '', supplierId: '' });
  };

  return (
    <div style={formulationStyles.stack}>
      <div style={styles.totalRow}>
        <span style={{ ...formulationStyles.badge, ...totalTone(total) }}>Current Total: {formatValue(total)}%</span>
        <span style={{ ...formulationStyles.badge, ...totalTone(total) }}>Remaining: {formatValue(remaining)}%</span>
      </div>
      <div style={formulationStyles.tableWrap}>
        <table style={formulationStyles.table}>
          <thead>
            <tr>
              <th style={formulationStyles.th}>Material *</th>
              <th style={formulationStyles.th}>Supplier</th>
              <th style={formulationStyles.th}>Lot Number</th>
              <th style={formulationStyles.th}>Percent Composition *</th>
              <th style={formulationStyles.th}>Basis</th>
              {!readOnly && <th style={formulationStyles.th}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {components.map((component, index) => (
              <tr key={`${component.materialId}-${index}`}>
                <td style={formulationStyles.td}>
                  {readOnly ? (
                    <input disabled style={controlStyles.input} value={materialSearchValue(materials.find((item) => item.id === component.materialId))} />
                  ) : (
                    <>
                      <input
                        aria-label={`Search material for component ${index + 1}`}
                        autoComplete="off"
                        list="formulation-material-options"
                        onChange={(event) => selectMaterial(index, event.target.value)}
                        placeholder="Search material name"
                        style={controlStyles.input}
                        value={materialSearches[index] ?? materialSearchValue(materials.find((item) => item.id === component.materialId))}
                      />
                      <datalist id="formulation-material-options">
                        {materials.map((item) => <option key={item.id} value={materialSearchValue(item)} />)}
                      </datalist>
                    </>
                  )}
                </td>
                <td style={formulationStyles.td}>
                  <select disabled={readOnly} onChange={(event) => update(index, { materialLotId: '', supplierId: event.target.value || null })} style={controlStyles.input} value={component.supplierId ?? ''}>
                    <option value="">Select</option>
                    {suppliers.filter((item) => supplierMatchesMaterial(item.id, component.materialId, materials)).map((item) => <option key={item.id} value={item.id}>{String(item['label'])}</option>)}
                  </select>
                </td>
                <td style={formulationStyles.td}>
                  <select disabled={readOnly} onChange={(event) => update(index, { materialLotId: event.target.value })} style={controlStyles.input} value={component.materialLotId ?? ''}>
                    <option value="">Select</option>
                    {lots.filter((lot) => lot['materialId'] === component.materialId && lot['supplierId'] === component.supplierId).map((item) => (
                      <option key={item.id} value={item.id}>{String(item['code'] ?? item['label'])}</option>
                    ))}
                  </select>
                </td>
                <td style={formulationStyles.td}>
                  <input
                    disabled={readOnly}
                    min={0}
                    max={100}
                    onChange={(event) => update(index, { percentComposition: Number(event.target.value) })}
                    style={controlStyles.input}
                    type="number"
                    value={String(component.percentComposition)}
                  />
                </td>
                <td style={formulationStyles.td}>weight_percent</td>
                {!readOnly && (
                  <td style={formulationStyles.td}>
                    <button onClick={() => onChange(components.filter((_, currentIndex) => currentIndex !== index))} style={controlStyles.subtleButton} type="button">Remove</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button
          onClick={() => onChange([...components, { basis: 'weight_percent', materialId: '', materialLotId: '', percentComposition: 0, supplierId: '' }])}
          style={controlStyles.secondaryButton}
          type="button"
        >
          Add Component
        </button>
      )}
      {warnings.map((warning) => <div key={warning} style={styles.warning}>{warning}</div>)}
    </div>
  );
}

function materialSearchValue(material?: LibraryRecord): string {
  if (!material) return '';
  const name = String(material['label'] ?? '');
  const code = String(material['code'] ?? '');
  return code ? `${name} (${code})` : name;
}

function supplierMatchesMaterial(supplierId: string, materialId: string, materials: LibraryRecord[]): boolean {
  if (!materialId) return true;
  const supplierIds = materials.find((material) => material.id === materialId)?.['supplierIds'];
  return !Array.isArray(supplierIds) || supplierIds.includes(supplierId);
}

const styles: Record<string, CSSProperties> = {
  totalRow: { display: 'flex', flexWrap: 'wrap', gap: spacing.space3 },
  warning: { color: colors.status.warning, fontSize: 13 },
};
