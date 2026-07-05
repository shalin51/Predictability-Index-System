import { formatReportValue, reportStyles } from './reportFormat';

const labels: Record<string, string> = {
  coolingTime: 'Cooling Time',
  cureHours: 'Cure Hours',
  cycleTime: 'Cycle Time',
  injectionPressure: 'Injection Pressure',
  machine: 'Machine',
  meltTemperature: 'Melt Temperature',
  mold: 'Mold',
};

export function ReportManufacturingPanel({ data }: { data: Record<string, unknown> }) {
  return (
    <div style={reportStyles.cardGrid}>
      {Object.entries(labels).map(([key, label]) => (
        <div key={key} style={reportStyles.panel}>
          <div style={reportStyles.muted}>{label}</div>
          <strong>{formatReportValue(data[key])}</strong>
        </div>
      ))}
    </div>
  );
}
