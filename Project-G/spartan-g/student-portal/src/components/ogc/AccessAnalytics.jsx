import React from 'react';

function StatCard({ label, value, note }) {
  return (
    <article className="metric-card analytics-model-card">
      <h3>{label}</h3>
      <p className="analytics-model-value">{value}</p>
      {note ? <span className="analytics-model-note">{note}</span> : null}
    </article>
  );
}

export default function AccessAnalytics({ data, onRefresh, loading }) {
  const totalStudents = data?.summary?.totalStudents || 0;
  const criticalCount = data?.summary?.criticalCount || 0;
  const highRisk = data?.summary?.riskCounts?.High || 0;
  const lowRisk = data?.summary?.riskCounts?.Low || 0;
  const lastSynced = data?.criticalAlerts?.[0]?.latestClassificationAt || data?.students?.[0]?.latestClassificationAt || null;

  return (
    <div className="analytics-view access-analytics-view">
      <section className="analytics-hero">
        <div>
          <h2>Access Analytics</h2>
          <p>Live facilitator access to student assessment outputs synced from the student portal GAWA forms.</p>
        </div>
        <button type="button" className="danger-btn load-analytics" onClick={onRefresh} disabled={loading}>
          {loading ? 'Syncing...' : 'Sync Live Data'}
        </button>
      </section>

      <section className="hero-metrics">
        <StatCard label="Total Students" value={totalStudents} note="Students in the current facilitator scope" />
        <StatCard label="Critical Alerts" value={criticalCount} note="Immediate attention required" />
        <StatCard label="High Risk" value={highRisk} note="Needs active monitoring" />
        <StatCard label="Low Risk" value={lowRisk} note="No urgent intervention" />
      </section>

      <section className="sync-status-card summary-card full-width">
        <h3>Sync Status</h3>
        <p>{lastSynced ? `Latest assessment sync: ${new Date(lastSynced).toLocaleString()}` : 'Waiting for the first student submissions to sync.'}</p>
        <p>Data source: student portal GAWA submissions, aggregated directly from the backend database on refresh.</p>
      </section>
    </div>
  );
}