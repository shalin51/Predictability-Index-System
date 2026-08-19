import type { DashboardDataInventoryItem } from '../../../services/api';
import { dashboardStyles } from './dashboardFormat';

export function DataInventoryPanel({ rows }: { rows: DashboardDataInventoryItem[] }) {
  const groups = rows.reduce<Record<string, DashboardDataInventoryItem[]>>((result, row) => {
    (result[row.domain] ??= []).push(row);
    return result;
  }, {});

  return (
    <div className="dashboard-data-inventory">
      {Object.entries(groups).map(([domain, tables]) => (
        <section key={domain} style={dashboardStyles.panel}>
          <div style={dashboardStyles.header}>
            <h3 style={dashboardStyles.sectionTitle}>{domain}</h3>
            <strong>{tables.reduce((total, table) => total + table.rowCount, 0).toLocaleString()} records</strong>
          </div>
          <div className="dashboard-data-inventory__tables">
            {tables.map((table) => (
              <div key={table.tableName} className="dashboard-data-inventory__row">
                <span>{table.tableName.replace(/_/g, ' ')}</span>
                <strong>{table.rowCount.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
