import React from 'react';

function pathwayClass(pathway) {
  if (pathway === 'Refer') return 'pathway-badge refer';
  if (pathway === 'Intervene') return 'pathway-badge intervene';
  return 'pathway-badge monitor';
}

function pathwayHint(pathway) {
  if (pathway === 'Refer') return 'Immediate counselor action advised';
  if (pathway === 'Intervene') return 'Planned facilitator outreach advised';
  return 'Regular monitoring and support';
}

export default function PrescriptiveAnalytics({ data, loading, onRefresh }) {
  const rows = data || [];
  const counts = rows.reduce((acc, row) => {
    const key = row.pathway || 'Monitor';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, { Refer: 0, Intervene: 0, Monitor: 0 });

  return (
    <div className="analytics-view prescriptive-analytics-view">
      <section className="analytics-hero">
        <div>
          <h2>Prescriptive Analytics</h2>
          <p>Rule-based intervention pathways and decision support for facilitator-supervised action.</p>
        </div>
        <button type="button" className="danger-btn load-analytics" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing Recommendations...' : 'Refresh Recommendations'}
        </button>
      </section>

      <section className="prescriptive-kpi-grid" aria-label="Prescriptive analytics summary">
        <article className="metric-card prescriptive-kpi-card">
          <h4>Total Recommendations</h4>
          <p>{rows.length}</p>
        </article>
        <article className="metric-card prescriptive-kpi-card">
          <h4>Refer</h4>
          <p>{counts.Refer || 0}</p>
        </article>
        <article className="metric-card prescriptive-kpi-card">
          <h4>Intervene</h4>
          <p>{counts.Intervene || 0}</p>
        </article>
        <article className="metric-card prescriptive-kpi-card">
          <h4>Monitor</h4>
          <p>{counts.Monitor || 0}</p>
        </article>
      </section>

      <section className="summary-card full-width">
        <h3>Intervention Recommendations</h3>
        {loading && !rows.length ? (
          <p className="empty-state">Syncing student assessment data and generating recommendations...</p>
        ) : rows.length ? (
          <div className="prescriptive-list">
            {rows.map((row, index) => (
              <React.Fragment key={row.pseudoId || row.studentId}>
                <article className={`prescriptive-item ${index % 2 === 1 ? 'alt' : ''}`}>
                  <header className="prescriptive-item-head">
                    <div className="prescriptive-student">
                      <strong>{row.pseudoId || row.studentId}</strong>
                    </div>
                    <span className={pathwayClass(row.pathway)}>{row.pathway || 'Monitor'}</span>
                  </header>

                  <p className="pathway-hint">{pathwayHint(row.pathway)}</p>

                  <div className="rule-pill-list" aria-label="Recommendation rules">
                    {(row.rules || ['No active rules']).map((rule) => (
                      <span key={`${row.pseudoId || row.studentId}-${rule}`} className="rule-pill">{rule}</span>
                    ))}
                  </div>
                </article>
                {index < rows.length - 1 ? <hr className="prescriptive-separator" aria-hidden="true" /> : null}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <p className="empty-state">No prescriptive recommendations loaded yet.</p>
        )}
      </section>
    </div>
  );
}