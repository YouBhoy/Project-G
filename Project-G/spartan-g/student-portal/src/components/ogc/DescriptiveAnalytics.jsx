import React from 'react';

function Sparkline({ values, width = 200, height = 40, stroke = '#8B0000' }) {
  const valid = values.map((v) => (v === null || v === undefined ? NaN : v));
  const nums = valid.filter((v) => !isNaN(v));
  const min = nums.length ? Math.min(...nums) : 0;
  const max = nums.length ? Math.max(...nums) : 1;
  const points = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * width;
    const y = isNaN(v) ? height : height - ((v - min) / Math.max(1e-6, max - min)) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={points} />
    </svg>
  );
}

export default function DescriptiveAnalytics({ data }) {
  const risk = data.summary?.riskCounts || {};
  const histogram = data.descriptive?.moodHistogram || [];
  const daily = data.descriptive?.daily || [];
  const cohorts = data.descriptive?.cohortComparisons || {};
  const assessments = data.descriptive?.assessments || {};

  const totalHist = histogram.reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="descriptive-wrap">
      <section className="metrics-row">
        <div className="metric-card"><h4>Total Students</h4><p>{data.summary?.totalStudents ?? '-'}</p></div>
        <div className="metric-card"><h4>Critical</h4><p>{data.summary?.criticalCount ?? '-'}</p></div>
        <div className="metric-card"><h4>High Risk</h4><p>{data.summary?.riskCounts?.High ?? 0}</p></div>
        <div className="metric-card"><h4>Median Mood</h4><p>{Math.round((data.descriptive?.moodPercentiles?.p50 || 0) * 100) / 100}</p></div>
      </section>

      <section className="viz-row">
        <article className="viz-card">
          <h5>Risk Distribution</h5>
          <div className="risk-bars">
            {['Low','Moderate','High','Crisis'].map((k)=>{
              const v = data.summary?.riskCounts?.[k] || 0;
              const pct = Math.round((v / Math.max(1, data.summary?.totalStudents || 1)) * 100);
              return (
                <div key={k} className="risk-row">
                  <div className="risk-label">{k}</div>
                  <div className="risk-bar-outer"><div className="risk-bar-inner" style={{ width: `${pct}%` }}></div></div>
                  <div className="risk-value">{v}</div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="viz-card">
          <h5>Mood Histogram (0–10)</h5>
          <div className="histogram">
            {histogram.map((count, idx)=> (
              <div key={idx} className="hist-bar" title={`${idx}: ${count}`}>
                <div className="hist-fill" style={{ height: `${Math.round((count/totalHist)*100)}%` }}></div>
                <div className="hist-label">{idx}</div>
              </div>
            ))}
          </div>
        </article>

        <article className="viz-card">
          <h5>30-day Mood Trend</h5>
          <Sparkline values={daily.map(d => d.avgMood)} width={300} height={60} />
          <div className="trend-meta">Avg points: {daily.reduce((s,d)=>s+(d.avgMood||0),0).toFixed(1)}</div>
        </article>
      </section>

      <section className="cohort-card">
        <h5>Cohort Comparisons</h5>
        <div className="cohort-list">
          {Object.entries(cohorts).map(([college, info]) => (
            <div key={college} className="cohort-row">
              <div className="cohort-name">{college}</div>
              <div className="cohort-stats">Students: {info.students} &nbsp; AvgMood: {info.avgMood ?? '-'} &nbsp; HighRisk: {info.highRisk}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="assessment-card">
        <h5>Assessment Summaries</h5>
        <div className="assessment-grid">
          <div className="assess-box">
            <h6>PHQ-9</h6>
            <p>Count: {assessments.phq?.count ?? 0}</p>
            <p>Mean: {assessments.phq?.mean ?? '-'}</p>
            <p>Median: {assessments.phq?.median ?? '-'}</p>
            <div className="assess-buckets">
              {assessments.phq && Object.entries(assessments.phq.buckets || {}).map(([k,v])=> (<div key={k}>{k}: {v}</div>))}
            </div>
          </div>

          <div className="assess-box">
            <h6>GAD-7</h6>
            <p>Count: {assessments.gad?.count ?? 0}</p>
            <p>Mean: {assessments.gad?.mean ?? '-'}</p>
            <p>Median: {assessments.gad?.median ?? '-'}</p>
            <div className="assess-buckets">
              {assessments.gad && Object.entries(assessments.gad.buckets || {}).map(([k,v])=> (<div key={k}>{k}: {v}</div>))}
            </div>
          </div>

          <div className="assess-box">
            <h6>DASS-21 (Subscales)</h6>
            {assessments.dass ? Object.entries(assessments.dass).map(([sub,info])=> (
              <div key={sub} style={{ marginBottom: '0.6rem' }}>
                <strong>{sub}</strong>
                <div>Count: {info.count}</div>
                <div>Mean: {info.mean ?? '-'}</div>
                <div>Median: {info.median ?? '-'}</div>
                <div className="assess-buckets">{Object.entries(info.buckets||{}).map(([k,v])=> (<span key={k} style={{marginRight:8}}>{k}:{v}</span>))}</div>
              </div>
            )) : <div>No DASS data</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
