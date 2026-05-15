import React from 'react';

function toTopFeatures(explanations = []) {
  return [...explanations]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3);
}

function riskBand(score) {
  if (score >= 0.85) return 'Very High';
  if (score >= 0.65) return 'High';
  if (score >= 0.45) return 'Moderate';
  return 'Low';
}

function bandClassName(band) {
  if (band === 'Very High') return 'risk-band very-high';
  if (band === 'High') return 'risk-band high';
  if (band === 'Moderate') return 'risk-band moderate';
  return 'risk-band low';
}

function DriverChip({ feature, contribution }) {
  const value = Number(contribution || 0);
  const direction = value >= 0 ? 'up' : 'down';
  const sign = value >= 0 ? '+' : '';
  return (
    <span className={`driver-chip ${direction}`}>
      <strong>{feature}</strong>
      <span>{`${sign}${value.toFixed(2)}`}</span>
    </span>
  );
}

function ScoreBar({ value }) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value || 0) * 100)));
  return (
    <div className="score-wrap">
      <span className="score-value">{pct}%</span>
      <div className="score-track" aria-hidden="true">
        <div className="score-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function PredictiveAnalytics({ data, loading, onRefresh }) {
  const rows = data?.rows || [];
  const averageLogistic = rows.length
    ? Math.round((rows.reduce((sum, row) => sum + Number(row.probs?.logistic || 0), 0) / rows.length) * 100)
    : 0;
  const averageXgboost = rows.length
    ? Math.round((rows.reduce((sum, row) => sum + Number(row.probs?.xgboost || 0), 0) / rows.length) * 100)
    : 0;
  const elevatedCount = rows.filter((row) => Number(row.probs?.xgboost || 0) >= 0.65).length;

  return (
    <div className="analytics-view predictive-analytics-view">
      <section className="analytics-hero">
        <div>
          <h2>Predictive Analytics</h2>
          <p>Two risk estimates are shown: a Basic Risk Score and a Smart Risk Score, both synced from live student assessment data.</p>
        </div>
        <button type="button" className="danger-btn load-analytics" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing Predictions...' : 'Refresh Predictions'}
        </button>
      </section>

      <section className="predictive-kpi-grid" aria-label="Predictive analytics summary">
        <article className="metric-card predictive-kpi-card">
          <h4>Students Scored</h4>
          <p>{rows.length}</p>
        </article>
        <article className="metric-card predictive-kpi-card">
          <h4>Avg Basic Risk Score</h4>
          <p>{averageLogistic}%</p>
        </article>
        <article className="metric-card predictive-kpi-card">
          <h4>Avg Smart Risk Score</h4>
          <p>{averageXgboost}%</p>
        </article>
        <article className="metric-card predictive-kpi-card">
          <h4>Elevated Risk</h4>
          <p>{elevatedCount}</p>
        </article>
      </section>

      <section className="prediction-table-card summary-card full-width">
        <h3>Student Risk Probabilities</h3>
        {loading && !rows.length ? (
          <p className="empty-state">Syncing student assessment data and training model outputs...</p>
        ) : rows.length ? (
          <div className="analytics-table-wrap">
            <table className="ogc-table analytics-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Risk Band</th>
                  <th>Basic Risk Score</th>
                  <th>Smart Risk Score</th>
                  <th>Top Drivers</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const logistic = Number(row.probs?.logistic || 0);
                  const xgboost = Number(row.probs?.xgboost || 0);
                  const band = riskBand(xgboost);
                  const topDrivers = toTopFeatures(row.explanations?.xgboost || row.explanations?.logistic || []);
                  return (
                    <tr key={row.pseudoId || row.studentId}>
                      <td className="student-id-cell"><strong>{row.pseudoId || row.studentId}</strong></td>
                      <td><span className={bandClassName(band)}>{band}</span></td>
                      <td><ScoreBar value={logistic} /></td>
                      <td><ScoreBar value={xgboost} /></td>
                      <td className="driver-cell">
                        {topDrivers.length ? (
                          <div className="driver-chip-list">
                            {topDrivers.map((item) => (
                              <DriverChip
                                key={`${row.pseudoId || row.studentId}-${item.feature}`}
                                feature={item.feature}
                                contribution={item.contribution}
                              />
                            ))}
                          </div>
                        ) : 'No explanation data yet'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No predictive outputs loaded yet.</p>
        )}
      </section>
    </div>
  );
}