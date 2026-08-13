
const predictionDrivers = [
  { impact: 'Strong positive', marker: '+++', result: '8.7', target: '8.2-9.1', tone: 'green', variable: 'Data Point 17' },
  { impact: 'Positive', marker: '++', result: '42.1', target: '40-45', tone: 'green', variable: 'Data Point 4' },
  { impact: 'Watch', marker: '-', result: '16.4', target: '12-15', tone: 'yellow', variable: 'Data Point 31' },
  { impact: 'Negative', marker: '---', result: '7.1', target: '8-11', tone: 'red', variable: 'Data Point 8' },
  { impact: 'Positive', marker: '++', result: '0.84', target: '0.80-0.90', tone: 'green', variable: 'Data Point 22' },
] as const;

export function PredictiveIndexPanel() {
  return (
    <section className="predictive-index" aria-labelledby="predictive-index-title">
      <div className="predictive-index__heading">
        <div>
          <p className="predictive-index__eyebrow">Static preview data</p>
          <h2 id="predictive-index-title">Predictive Index - Formulation X-247</h2>
          <p>Decision support for the expected fit against your performance standards.</p>
        </div>
        <span className="predictive-index__confidence">Model confidence <strong>91%</strong></span>
      </div>

      <div className="predictive-index__matches">
        <MatchCard label="Target Standard A" score={87} tone="green" recommendation="Strong candidate for A" />
        <MatchCard label="Target Standard B" score={64} tone="yellow" recommendation="Borderline match" />
        <div className="predictive-index__data-card">
          <span>Inputs available</span>
          <strong>47 <small>/ 53</small></strong>
          <p>Enough data for a high-confidence prediction.</p>
        </div>
      </div>

      <div className="predictive-index__section">
        <div className="predictive-index__section-head">
          <div>
            <h3>Predicted performance position</h3>
            <p>Expected placement with an uncertainty range around the current formulation.</p>
          </div>
          <span className="predictive-index__range-label">X-247 predicted range</span>
        </div>
        <div className="predictive-index__scale" aria-label="X-247 is predicted within the Standard A range">
          <div className="predictive-index__scale-labels"><span>Below standard</span><span>Standard B</span><span>Standard A</span><span>Above standard</span></div>
          <div className="predictive-index__rail">
            <span className="predictive-index__zone predictive-index__zone--b" />
            <span className="predictive-index__zone predictive-index__zone--a" />
            <span className="predictive-index__uncertainty" />
            <span className="predictive-index__pointer" />
          </div>
        </div>
      </div>

      <div className="predictive-index__details">
        <div className="predictive-index__section">
          <div className="predictive-index__section-head"><div><h3>Top prediction drivers</h3><p>The measurements having the largest current effect on this prediction.</p></div></div>
          <div className="predictive-index__table-wrap">
            <table className="predictive-index__table">
              <thead><tr><th>#</th><th>Variable</th><th>Result</th><th>Target range</th><th>Influence</th></tr></thead>
              <tbody>{predictionDrivers.map((driver, index) => <tr key={driver.variable}><td>{index + 1}</td><td>{driver.variable}</td><td>{driver.result}</td><td>{driver.target}</td><td><Impact tone={driver.tone} marker={driver.marker} label={driver.impact} /></td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <aside className="predictive-index__insight">
          <p className="predictive-index__eyebrow">Model insight</p>
          <dl>
            <div><dt>Most influential</dt><dd>Data Pt 17, Data Pt 4, Data Pt 31</dd></div>
            <div><dt>Biggest risk to Standard A</dt><dd>Data Point 8</dd></div>
            <div><dt>Next valuable test</dt><dd>Data Point 31</dd></div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

function MatchCard({ label, score, tone, recommendation }: { label: string; score: number; tone: 'green' | 'yellow'; recommendation: string }) {
  return <div className={`predictive-index__match predictive-index__match--${tone}`}><span>{label}</span><strong><i aria-hidden="true" />{score}%</strong><p>{recommendation}</p></div>;
}

function Impact({ label, marker, tone }: { label: string; marker: string; tone: string }) {
  return <span className={`predictive-index__impact predictive-index__impact--${tone}`}><b>{marker}</b>{label}</span>;
}
