import express from 'express';
import { readDb } from '../../db.mysql.js';

const router = express.Router();

function mean(values) {
  if (!values || values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values) {
  if (!values || values.length === 0) return null;
  const m = mean(values);
  const v = values.reduce((s, x) => s + (x - m) * (x - m), 0) / values.length;
  return Math.sqrt(v);
}

function median(values) {
  if (!values || values.length === 0) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 === 0 ? (v[mid - 1] + v[mid]) / 2 : v[mid];
}

function percentile(values, p) {
  if (!values || values.length === 0) return null;
  const v = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (v.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return v[lo];
  return v[lo] + (v[hi] - v[lo]) * (idx - lo);
}

// GET /api/ogc/dashboard
router.get('/', async (req, res) => {
  try {
    const snapshot = await readDb();

    const students = snapshot.students || [];
    const esm = snapshot.esmEntries || [];
    const classifications = snapshot.riskClassifications || [];
    const dassResponses = snapshot.dass21Responses || [];
    const assessments = snapshot.assessments || [];

    const totalStudents = students.length;

    // Helper: latest classification per student
    const latestClassByStudent = {};
    for (const c of classifications) {
      const sid = c.studentId;
      if (!latestClassByStudent[sid] || new Date(c.generatedAt) > new Date(latestClassByStudent[sid].generatedAt)) {
        latestClassByStudent[sid] = c;
      }
    }

    // Risk counts
    const riskCounts = { Low: 0, Moderate: 0, High: 0, Crisis: 0 };
    for (const sid of Object.keys(latestClassByStudent)) {
      const level = latestClassByStudent[sid].riskLevel || 'Low';
      if (riskCounts[level] !== undefined) riskCounts[level]++;
      else riskCounts[level] = (riskCounts[level] || 0) + 1;
    }

    const criticalAlerts = [];
    for (const [sid, cls] of Object.entries(latestClassByStudent)) {
      if (cls.riskLevel === 'Crisis') {
        criticalAlerts.push({
          pseudoId: `S-${String(sid).padStart(4, '0')}`,
          latestClassificationAt: cls.generatedAt,
          contact: { canContact: true, studentId: sid }
        });
      }
    }

    // Cohort analysis: by college, yearLevel, sex
    const cohorts = { byCollege: {}, byYear: {}, bySex: {} };
    for (const s of students) {
      cohorts.byCollege[s.college] = (cohorts.byCollege[s.college] || 0) + 1;
      cohorts.byYear[s.yearLevel] = (cohorts.byYear[s.yearLevel] || 0) + 1;
      cohorts.bySex[s.sex] = (cohorts.bySex[s.sex] || 0) + 1;
    }

    // Rolling window summaries for esm mood/energy
    const now = new Date();
    const windows = [7, 14, 30];
    const rolling = {};
    for (const w of windows) {
      const cutoff = new Date(now.getTime() - w * 24 * 60 * 60 * 1000);
      const subset = esm.filter((e) => new Date(e.promptTime) >= cutoff);
      rolling[w] = {
        avgMood: mean(subset.map((x) => x.moodScore).filter((v) => v !== undefined && v !== null)),
        avgEnergy: mean(subset.map((x) => x.energyScore).filter((v) => v !== undefined && v !== null)),
        count: subset.length
      };
    }

    // Descriptive analytics: distributions, percentiles, daily trend (last 30 days), cohort comparisons
    const allMoodScores = esm.map((e) => e.moodScore).filter((v) => typeof v === 'number');
    const moodHistogram = Array.from({ length: 11 }, (_, i) => 0);
    for (const m of allMoodScores) {
      const idx = Math.min(10, Math.max(0, Math.round(m)));
      moodHistogram[idx]++;
    }

    const moodPercentiles = {
      p10: percentile(allMoodScores, 10),
      p25: percentile(allMoodScores, 25),
      p50: percentile(allMoodScores, 50),
      p75: percentile(allMoodScores, 75),
      p90: percentile(allMoodScores, 90)
    };

    // daily averages for last 30 days
    const days = 30;
    const daily = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      const slice = esm.filter((e) => new Date(e.promptTime) >= start && new Date(e.promptTime) <= end);
      const moods = slice.map((s) => s.moodScore).filter((v) => typeof v === 'number');
      daily.push({ date: start.toISOString().slice(0, 10), avgMood: moods.length ? mean(moods) : null, count: moods.length });
    }

    // Cohort comparisons
    const cohortComparisons = {};
    const studentsByCollege = {};
    for (const s of students) studentsByCollege[s.college] = studentsByCollege[s.college] || [];
    for (const s of students) studentsByCollege[s.college].push(s.studentId);
    for (const [college, ids] of Object.entries(studentsByCollege)) {
      const collegeEsm = esm.filter((e) => ids.includes(e.studentId));
      const moods = collegeEsm.map((e) => e.moodScore).filter((v) => typeof v === 'number');
      const energies = collegeEsm.map((e) => e.energyScore).filter((v) => typeof v === 'number');
      const highRisk = ids.filter((id) => latestClassByStudent[id] && latestClassByStudent[id].riskLevel === 'High').length;
      cohortComparisons[college] = {
        students: ids.length,
        avgMood: moods.length ? Math.round(mean(moods) * 100) / 100 : null,
        avgEnergy: energies.length ? Math.round(mean(energies) * 100) / 100 : null,
        highRisk
      };
    }

    // Assessment aggregations: DASS-21, PHQ-9, GAD-7
    const assessmentsById = {};
    for (const a of assessments) assessmentsById[a.assessmentId] = a;

    const dassResponsesByAssess = {};
    for (const r of snapshot.dass21Responses || []) {
      dassResponsesByAssess[r.assessmentId] = dassResponsesByAssess[r.assessmentId] || [];
      dassResponsesByAssess[r.assessmentId].push(r);
    }

    function computePhqSeverity(score) {
      if (score >= 20) return 'Severe';
      if (score >= 15) return 'Moderately severe';
      if (score >= 10) return 'Moderate';
      if (score >= 5) return 'Mild';
      return 'Minimal';
    }

    function computeGadSeverity(score) {
      if (score >= 15) return 'Severe';
      if (score >= 10) return 'Moderate';
      if (score >= 5) return 'Mild';
      return 'Minimal';
    }

    function computeDassSeverity(subscale, score) {
      // score should be doubled (DASS-21 -> DASS-42 equivalent)
      const s = score * 2;
      if (subscale === 'Depression') {
        if (s >= 28) return 'Extremely Severe';
        if (s >= 21) return 'Severe';
        if (s >= 14) return 'Moderate';
        if (s >= 10) return 'Mild';
        return 'Normal';
      }
      if (subscale === 'Anxiety') {
        if (s >= 20) return 'Extremely Severe';
        if (s >= 15) return 'Severe';
        if (s >= 10) return 'Moderate';
        if (s >= 8) return 'Mild';
        return 'Normal';
      }
      // Stress
      if (s >= 34) return 'Extremely Severe';
      if (s >= 26) return 'Severe';
      if (s >= 19) return 'Moderate';
      if (s >= 15) return 'Mild';
      return 'Normal';
    }

    const phqScores = [];
    const gadScores = [];
    const dassSubscales = { Depression: [], Anxiety: [], Stress: [] };

    for (const a of assessments) {
      const typ = (a.type || '').toUpperCase();
      const responsesFor = dassResponsesByAssess[a.assessmentId] || [];
      if (typ === 'PHQ9') {
        const total = responsesFor.reduce((s, r) => s + (Number(r.score) || 0), 0);
        phqScores.push({ studentId: a.studentId, submittedAt: a.submittedAt, score: total });
      } else if (typ === 'GAD7') {
        const total = responsesFor.reduce((s, r) => s + (Number(r.score) || 0), 0);
        gadScores.push({ studentId: a.studentId, submittedAt: a.submittedAt, score: total });
      } else if (typ === 'DASS21' || typ === 'DASS-21') {
        // responsesFor likely contains subscale field per item
        const bySub = {};
        for (const r of responsesFor) {
          const sub = r.subscale || 'General';
          bySub[sub] = (bySub[sub] || 0) + Number(r.score || 0);
        }
        // Push if subscales exist
        for (const sub of Object.keys(dassSubscales)) {
          if (bySub[sub] !== undefined) {
            dassSubscales[sub].push({ studentId: a.studentId, submittedAt: a.submittedAt, score: bySub[sub] });
          }
        }
      }
    }

    const phqAgg = {
      count: phqScores.length,
      mean: phqScores.length ? Math.round(mean(phqScores.map((s) => s.score)) * 100) / 100 : null,
      median: phqScores.length ? median(phqScores.map((s) => s.score)) : null,
      buckets: phqScores.reduce((acc, cur) => {
        const sev = computePhqSeverity(cur.score);
        acc[sev] = (acc[sev] || 0) + 1;
        return acc;
      }, {})
    };

    const gadAgg = {
      count: gadScores.length,
      mean: gadScores.length ? Math.round(mean(gadScores.map((s) => s.score)) * 100) / 100 : null,
      median: gadScores.length ? median(gadScores.map((s) => s.score)) : null,
      buckets: gadScores.reduce((acc, cur) => {
        const sev = computeGadSeverity(cur.score);
        acc[sev] = (acc[sev] || 0) + 1;
        return acc;
      }, {})
    };

    const dassAgg = {};
    for (const sub of Object.keys(dassSubscales)) {
      const arr = dassSubscales[sub].map((s) => s.score);
      dassAgg[sub] = {
        count: arr.length,
        mean: arr.length ? Math.round(mean(arr) * 100) / 100 : null,
        median: arr.length ? median(arr) : null,
        buckets: arr.reduce((acc, sc) => {
          const sev = computeDassSeverity(sub, sc);
          acc[sev] = (acc[sev] || 0) + 1;
          return acc;
        }, {})
      };
    }

    // Attach to descriptive
    const assessmentsSummary = { phq: phqAgg, gad: gadAgg, dass: dassAgg };

    // Control-chart style anomalies per student: baseline mean/std over all time, flag last-7 entries beyond mean +/- 2*std
    const anomalies = [];
    const esmByStudent = {};
    for (const e of esm) {
      esmByStudent[e.studentId] = esmByStudent[e.studentId] || [];
      esmByStudent[e.studentId].push(e);
    }
    for (const [sid, entries] of Object.entries(esmByStudent)) {
      const moods = entries.map((x) => x.moodScore).filter((v) => typeof v === 'number');
      if (moods.length < 3) continue; // not enough data
      const m = mean(moods);
      const sd = stddev(moods) || 0;
      const cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recent = entries.filter((x) => new Date(x.promptTime) >= cutoffDate);
      const anomalousPoints = recent.filter((x) => Math.abs(x.moodScore - m) > 2 * sd);
      if (anomalousPoints.length) {
        anomalies.push({ studentId: sid, anomalies: anomalousPoints.length });
      }
    }

    // Student-level summary rows
    const studentRows = [];
    for (const s of students) {
      const sid = s.studentId;
      const es = esmByStudent[sid] || [];
      const moods = es.map((x) => x.moodScore).filter((v) => typeof v === 'number');
      const energies = es.map((x) => x.energyScore).filter((v) => typeof v === 'number');
      const avgMood = moods.length ? Math.round(mean(moods) * 100) / 100 : null;
      const avgEnergy = energies.length ? Math.round(mean(energies) * 100) / 100 : null;
      const latestCls = latestClassByStudent[sid] || null;

      studentRows.push({
        pseudoId: `S-${String(sid).padStart(4, '0')}`,
        college: s.college,
        yearLevel: s.yearLevel,
        latestRiskLevel: latestCls ? latestCls.riskLevel : 'Low',
        latestTrajectory: latestCls ? latestCls.trajectory : null,
        averageMood: avgMood,
        averageEnergy: avgEnergy,
        latestClassificationAt: latestCls ? latestCls.generatedAt : null
      });
    }

    const summary = {
      totalStudents,
      criticalCount: criticalAlerts.length,
      riskCounts,
      moodPercentiles: moodPercentiles,
      moodHistogramCount: moodHistogram.reduce((a,b)=>a+b,0)
    };

    return res.json({ success: true, data: { summary, cohorts, rolling, control: { anomalies }, criticalAlerts, students: studentRows, descriptive: { moodHistogram, moodPercentiles, daily, cohortComparisons, assessments: assessmentsSummary } } });
  } catch (err) {
    console.error('Dashboard error', err);
    return res.status(500).json({ success: false, message: 'Failed to compute dashboard.' });
  }
});

// Dev-only debug endpoint (no auth) - enabled when DEBUG_OGC=true
router.get('/debug', async (req, res) => {
  try {
    if (!process.env.DEBUG_OGC || process.env.DEBUG_OGC.toLowerCase() !== 'true') {
      return res.status(403).json({ success: false, message: 'Debug endpoint disabled.' });
    }
    // Reuse the same logic by calling the main handler indirectly: replicate minimal flow
    const snapshot = await readDb();
    // Simple wrapper: call main route logic by importing this file's functions is complex; instead call root route
    // For simplicity, call the root handler by invoking local function is not available; recreate minimal payload by invoking '/' logic via internal request is not feasible here.
    // Instead, call the same module-level computation by temporarily invoking the code path: we will call the root route via a fetch to localhost when available.
    // As a straightforward approach, compute the same result by duplicating minimal behavior: read snapshot and return precomputed placeholders.
    // Build a lightweight descriptive summary for debugging
    const students = snapshot.students || [];
    const esm = snapshot.esmEntries || [];
    const totalStudents = students.length;
    const moodScores = esm.map(e => e.moodScore).filter(v => typeof v === 'number');
    const meanMood = moodScores.length ? Math.round((moodScores.reduce((a,b)=>a+b,0)/moodScores.length)*100)/100 : null;

    return res.json({ success: true, data: { debug: true, summary: { totalStudents, meanMood }, counts: { esm: esm.length, dass: (snapshot.dass21Responses||[]).length } } });
  } catch (err) {
    console.error('Debug error', err);
    return res.status(500).json({ success: false, message: 'Debug failed.' });
  }
});

export default router;
