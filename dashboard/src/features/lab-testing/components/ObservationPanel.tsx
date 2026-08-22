import { useState } from 'react';
import { controlStyles } from '../../../components/ui/controls';
import type { LabResultRecord, SampleRecord } from '../../../services/api';
import { labStyles } from '../labTestingUi';

export function ObservationPanel({
  observations,
  onSave,
  sample,
  samples,
}: {
  observations: LabResultRecord[];
  onSave: (sampleId: string, observationType: string, observationText: string) => void;
  sample?: SampleRecord;
  samples: SampleRecord[];
}) {
  const [sampleId, setSampleId] = useState(samples[0]?.id ?? '');
  const [observationType, setObservationType] = useState('crack_propagation');
  const [text, setText] = useState('');

  return (
    <div style={labStyles.stack}>
      <div style={labStyles.panel}>
        <div style={{ ...labStyles.filters, gridTemplateColumns: sample ? '1fr 2fr auto' : '1fr 1fr 2fr auto', marginBottom: 0 }}>
          {!sample && <select onChange={(event) => setSampleId(event.target.value)} style={controlStyles.input} value={sampleId}>
            {samples.map((item) => <option key={item.id} value={item.id}>{item.sampleCode}</option>)}
          </select>}
          <select onChange={(event) => setObservationType(event.target.value)} style={controlStyles.input} value={observationType}>
            <option value="crack_propagation">Crack Propagation</option>
            <option value="player_feedback">Player Feedback</option>
            <option value="general">General</option>
          </select>
          <textarea onChange={(event) => setText(event.target.value)} style={{ ...controlStyles.textarea, minHeight: 48 }} value={text} />
          <button
            onClick={() => {
              const targetSampleId = sample?.id ?? sampleId;
              if (!targetSampleId || !text.trim()) return;
              onSave(targetSampleId, observationType, text.trim());
              setText('');
            }}
            style={controlStyles.primaryButton}
            type="button"
          >
            Add
          </button>
        </div>
      </div>
      <div style={labStyles.tableWrap}>
        <table style={labStyles.table}>
          <thead>
            <tr>
              {(sample ? ['Type', 'Observation', 'Observed At'] : ['Sample', 'Type', 'Observation', 'Observed At']).map((column) => <th key={column} style={labStyles.th}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {observations.map((item) => (
              <tr key={item.id}>
                {!sample && <td style={labStyles.td}>{samples.find((itemSample) => itemSample.id === item.sampleId)?.sampleCode ?? '-'}</td>}
                <td style={labStyles.td}>{String(item['observationType'] ?? '')}</td>
                <td style={labStyles.td}>{String(item['observationText'] ?? '')}</td>
                <td style={labStyles.td}>{String(item['observedAt'] ?? '').slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
