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
    throw new Error(payload.message || 'Request failed.');
  }
  return payload.data;
}

export const api = {
  signup: (body) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: (token) => request('/api/student/me', {}, token),
  ogcMe: (token) => request('/api/ogc/me', {}, token),
  setConsent: (consent, token) => request('/api/student/consent', { method: 'POST', body: JSON.stringify({ consent }) }, token),
  dassQuestions: (token) => request('/api/student/dass21/questions', {}, token),
  submitDass: (responses, token) => request('/api/student/dass21/submit', { method: 'POST', body: JSON.stringify({ responses }) }, token),
  submitPhq9: (body, token) => request('/api/student/phq9/submit', { method: 'POST', body: JSON.stringify(body) }, token),
  submitGad7: (body, token) => request('/api/student/gad7/submit', { method: 'POST', body: JSON.stringify(body) }, token),
  submitEsm: (body, token) => request('/api/student/esm/submit', { method: 'POST', body: JSON.stringify(body) }, token),
  dashboard: (token) => request('/api/student/dashboard', {}, token),
  ogcDashboard: (token) => request('/api/ogc/dashboard', {}, token),
  ogcContact: (body, token) => request('/api/ogc/contact', { method: 'POST', body: JSON.stringify(body) }, token),
  // GABAY Module - Appointments
  getAvailableSlots: (token) => request('/api/student/appointments/available', {}, token),
  bookAppointment: (body, token) => request('/api/student/appointments/book', { method: 'POST', body: JSON.stringify(body) }, token),
  getStudentAppointments: (token) => request('/api/student/appointments', {}, token),
  cancelAppointment: (appointmentId, token) => request(`/api/student/appointments/${appointmentId}`, { method: 'DELETE' }, token),
  getOgcAppointments: (token) => request('/api/ogc/appointments', {}, token),
  approveAppointment: (appointmentId, body, token) => request(`/api/ogc/appointments/${appointmentId}/approve`, { method: 'POST', body: JSON.stringify(body) }, token),
  rejectAppointment: (appointmentId, body, token) => request(`/api/ogc/appointments/${appointmentId}/reject`, { method: 'POST', body: JSON.stringify(body) }, token),
  completeAppointment: (appointmentId, body, token) => request(`/api/ogc/appointments/${appointmentId}/complete`, { method: 'POST', body: JSON.stringify(body) }, token),
  // GABAY Module - Availability Slots (OGC)
  createAvailabilitySlot: (body, token) => request('/api/ogc/availability/create', { method: 'POST', body: JSON.stringify(body) }, token),
  getOgcAvailabilitySlots: (token) => request('/api/ogc/availability/list', {}, token),
  deleteAvailabilitySlot: (slotId, token) => request(`/api/ogc/availability/${slotId}`, { method: 'DELETE' }, token),
  // GABAY Module - Emergency Contacts
  getEmergencyContacts: () => request('/api/emergency-contacts', {})
};
