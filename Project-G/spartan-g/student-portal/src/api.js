import { MAIN_API_BASE_URL } from './config.js';

async function request(path, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${MAIN_API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store'
  });

  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Request failed.');
  }
  return payload.data;
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
