const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

async function request(path, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store'
  });

  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.message || 'Request failed.');
    error.status = response.status;
    error.path = path;
    throw error;
  }
  return payload.data;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildPredictiveFallbackFromDashboard(dashboard) {
  const rows = (dashboard?.students || []).map((student) => {
    const risk = String(student.latestRiskLevel || 'Low');
    const mood = Number(student.averageMood ?? 5);
    const energy = Number(student.averageEnergy ?? 5);

    let baseRisk = 0.2;
    if (risk === 'Moderate') baseRisk = 0.45;
    if (risk === 'High') baseRisk = 0.75;
    if (risk === 'Crisis') baseRisk = 0.92;

    const moodAdjustment = (5 - mood) * 0.05;
    const energyAdjustment = (5 - energy) * 0.03;
    const probability = clamp(baseRisk + moodAdjustment + energyAdjustment, 0.01, 0.99);

    return {
      studentId: student.pseudoId || student.studentId,
      probs: {
        logistic: Number(probability.toFixed(4)),
        xgboost: Number(clamp(probability + 0.04, 0.01, 0.99).toFixed(4))
      },
      explanations: {
        logistic: [
          { feature: 'latestRiskLevel', contribution: Number((baseRisk - 0.2).toFixed(4)) },
          { feature: 'averageMood', contribution: Number(moodAdjustment.toFixed(4)) },
          { feature: 'averageEnergy', contribution: Number(energyAdjustment.toFixed(4)) }
        ],
        xgboost: [
          { feature: 'latestRiskLevel', contribution: Number((baseRisk - 0.2).toFixed(4)) },
          { feature: 'averageMood', contribution: Number(moodAdjustment.toFixed(4)) },
          { feature: 'averageEnergy', contribution: Number(energyAdjustment.toFixed(4)) }
        ]
      }
    };
  });

  return {
    featureNames: ['latestRiskLevel', 'averageMood', 'averageEnergy'],
    rows,
    fallbackMode: true
  };
}

function buildPrescriptiveFallbackFromPredictive(predictive) {
  const rows = (predictive?.rows || []).map((row) => {
    const score = Number(row?.probs?.xgboost || row?.probs?.logistic || 0);
    const rules = [];
    let pathway = 'Monitor';

    if (score >= 0.85) {
      pathway = 'Refer';
      rules.push('Immediate referral to OGC - possible crisis');
      rules.push('Escalate for same-day contact and safety planning');
    } else if (score >= 0.55) {
      pathway = 'Intervene';
      rules.push('Schedule check-in / outreach');
      rules.push('Recommend coping and stress management session');
    } else {
      pathway = 'Monitor';
      rules.push('Monitor and provide psychoeducation resources');
    }

    return {
      studentId: row.studentId,
      pathway,
      rules
    };
  });

  return rows;
}

export const api = {
  signup: (body) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  // Student Profile
  me: (token) => request('/api/student/profile/me', {}, token),
  setConsent: (consent, token) => request('/api/student/profile/consent', { method: 'POST', body: JSON.stringify({ consent }) }, token),
  // GAWA Assessments
  dassQuestions: (token) => request('/api/student/gawa/dass21/questions', {}, token),
  submitDass: (responses, token) => request('/api/student/gawa/dass21/submit', { method: 'POST', body: JSON.stringify({ responses }) }, token),
  submitPhq9: (body, token) => request('/api/student/gawa/phq9/submit', { method: 'POST', body: JSON.stringify(body) }, token),
  submitGad7: (body, token) => request('/api/student/gawa/gad7/submit', { method: 'POST', body: JSON.stringify(body) }, token),
  submitEsm: (body, token) => request('/api/student/gawa/esm/submit', { method: 'POST', body: JSON.stringify(body) }, token),
  dashboard: (token) => request('/api/student/gawa/dashboard', {}, token),
  // OGC Profile & Dashboard
  ogcMe: (token) => request('/api/ogc/me', {}, token),
  ogcDashboard: (token) => request('/api/ogc/dashboard', {}, token),
  ogcAnalyticsPredict: async (token) => {
    try {
      return await request('/api/ogc/analytics/predict', {}, token);
    } catch (error) {
      const notAvailable = error?.status === 404 || /Endpoint not found/i.test(error?.message || '');
      if (!notAvailable) throw error;

      // Fallback for deployments still running without the new analytics routes.
      const dashboard = await request('/api/ogc/dashboard', {}, token);
      return buildPredictiveFallbackFromDashboard(dashboard);
    }
  },
  ogcAnalyticsPrescribe: async (token) => {
    try {
      return await request('/api/ogc/analytics/prescribe', {}, token);
    } catch (error) {
      const notAvailable = error?.status === 404 || /Endpoint not found/i.test(error?.message || '');
      if (!notAvailable) throw error;

      // Fallback for deployments still running without the new analytics routes.
      const dashboard = await request('/api/ogc/dashboard', {}, token);
      const predictive = buildPredictiveFallbackFromDashboard(dashboard);
      return buildPrescriptiveFallbackFromPredictive(predictive);
    }
  },
  ogcContact: (body, token) => request('/api/ogc/contact', { method: 'POST', body: JSON.stringify(body) }, token),
  // GABAY - Student Appointments
  getAvailableSlots: (token) => request('/api/student/appointments/available', {}, token),
  bookAppointment: (body, token) => request('/api/student/appointments/book', { method: 'POST', body: JSON.stringify(body) }, token),
  getStudentAppointments: (token) => request('/api/student/appointments', {}, token),
  cancelAppointment: (appointmentId, token) => request(`/api/student/appointments/${appointmentId}`, { method: 'DELETE' }, token),
  // GABAY - OGC Appointments
  getOgcAppointments: (token) => request('/api/ogc/appointments', {}, token),
  approveAppointment: (appointmentId, body, token) => request(`/api/ogc/appointments/${appointmentId}/approve`, { method: 'POST', body: JSON.stringify(body) }, token),
  rejectAppointment: (appointmentId, body, token) => request(`/api/ogc/appointments/${appointmentId}/reject`, { method: 'POST', body: JSON.stringify(body) }, token),
  completeAppointment: (appointmentId, body, token) => request(`/api/ogc/appointments/${appointmentId}/complete`, { method: 'POST', body: JSON.stringify(body) }, token),
  // GABAY - OGC Availability Slots
  createAvailabilitySlot: (body, token) => request('/api/ogc/availability/create', { method: 'POST', body: JSON.stringify(body) }, token),
  getOgcAvailabilitySlots: (token) => request('/api/ogc/availability/list', {}, token),
  deleteAvailabilitySlot: (slotId, token) => request(`/api/ogc/availability/${slotId}`, { method: 'DELETE' }, token),
  // Emergency Contacts
  getEmergencyContacts: () => request('/api/emergency-contacts', {})
};
