import { DASS_SUBSCALES, todayDate } from './helpers.js';

export function severityLabel(subscale, score) {
  if (subscale === 'D') {
    if (score <= 9) return 'Normal';
    if (score <= 13) return 'Mild';
    if (score <= 20) return 'Moderate';
    if (score <= 27) return 'Severe';
    return 'Extremely Severe';
  }
  if (subscale === 'A') {
    if (score <= 7) return 'Normal';
    if (score <= 9) return 'Mild';
    if (score <= 14) return 'Moderate';
    if (score <= 19) return 'Severe';
    return 'Extremely Severe';
  }
  if (score <= 14) return 'Normal';
  if (score <= 18) return 'Mild';
  if (score <= 25) return 'Moderate';
  if (score <= 33) return 'Severe';
  return 'Extremely Severe';
}

export function riskFromSeverityMap(labels) {
  const allNormal = Object.values(labels).every((v) => v === 'Normal');
  if (allNormal) return 'Low';

  const anySevere = Object.values(labels).some((v) => v === 'Severe' || v === 'Extremely Severe');
  if (anySevere) return 'High';

  return 'Moderate';
}

export function computeSlope(points) {
  if (points.length < 2) return 0;
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    const x = i + 1;
    const y = points[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denominator = (n * sumXX) - (sumX * sumX);
  if (!denominator) return 0;
  return ((n * sumXY) - (sumX * sumY)) / denominator;
}

export function consecutiveLowDays(entries) {
  const byDay = new Map();
  entries.forEach((e) => {
    const day = e.promptTime.slice(0, 10);
    const avg = (e.moodScore + e.energyScore) / 2;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(avg);
  });

  const daily = Array.from(byDay.entries())
    .map(([day, values]) => ({ day, avg: values.reduce((a, b) => a + b, 0) / values.length }))
    .sort((a, b) => a.day.localeCompare(b.day));

  let streak = 0;
  for (let i = daily.length - 1; i >= 0; i -= 1) {
    if (daily[i].avg < 4) streak += 1;
    else break;
  }
  return streak;
}

export function trajectoryFromEsm(entries) {
  const ordered = [...entries].sort((a, b) => a.promptTime.localeCompare(b.promptTime));
  const last7Days = ordered.filter((e) => {
    const t = new Date(e.promptTime).getTime();
    const diff = Date.now() - t;
    return diff <= (7 * 24 * 60 * 60 * 1000);
  });

  const moodSlope = computeSlope(last7Days.map((e) => e.moodScore));
  const energySlope = computeSlope(last7Days.map((e) => e.energyScore));
  const combinedSlope = Math.min(moodSlope, energySlope);
  const lowStreak = consecutiveLowDays(last7Days);

  if (combinedSlope < -0.8 || lowStreak >= 3) {
    return { label: 'At-Risk', moodSlope, energySlope, combinedSlope, lowStreak };
  }
  if (combinedSlope < -0.3) {
    return { label: 'Deteriorating', moodSlope, energySlope, combinedSlope, lowStreak };
  }
  return { label: 'Stable', moodSlope, energySlope, combinedSlope, lowStreak };
}

export function ensureCycle(db, studentId) {
  const active = db.assessmentCycles.find((c) => c.studentId === studentId && c.status === 'Active');
  if (active) return active;

  const newCycle = {
    cycleId: db.counters.cycleId++,
    studentId,
    startDate: todayDate(),
    endDate: null,
    status: 'Active'
  };
  db.assessmentCycles.push(newCycle);
  return newCycle;
}

export function scorePhq9(answers) {
  const scores = Object.values(answers);
  const total = scores.reduce((a, b) => a + b, 0);
  let severity = 'Low';
  if (total >= 5 && total < 10) severity = 'Moderate';
  else if (total >= 10 && total < 15) severity = 'High';
  else if (total >= 15) severity = 'Crisis';
  return { total, severity };
}

export function scoreGad7(answers) {
  const scores = Object.values(answers);
  const total = scores.reduce((a, b) => a + b, 0);
  let severity = 'Low';
  if (total >= 5 && total < 10) severity = 'Moderate';
  else if (total >= 10 && total < 15) severity = 'High';
  else if (total >= 15) severity = 'Crisis';
  return { total, severity };
}
