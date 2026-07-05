import { reportStyles } from './reportFormat';

export function ReportRiskPanel({ risks }: { risks: string[] }) {
  return (
    <div style={reportStyles.panel}>
      {risks.length === 0 ? <div style={reportStyles.muted}>No key risks detected.</div> : (
        <ul>
          {risks.map((risk) => <li key={risk}>{risk}</li>)}
        </ul>
      )}
    </div>
  );
}
