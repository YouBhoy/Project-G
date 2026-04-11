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
    headers
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
  setConsent: (consent, token) => request('/api/student/consent', { method: 'POST', body: JSON.stringify({ consent }) }, token),
  dassQuestions: (token) => request('/api/student/dass21/questions', {}, token),
  submitDass: (responses, token) => request('/api/student/dass21/submit', { method: 'POST', body: JSON.stringify({ responses }) }, token),
  submitCssrs: (body, token) => request('/api/student/cssrs/submit', { method: 'POST', body: JSON.stringify(body) }, token),
  submitEsm: (body, token) => request('/api/student/esm/submit', { method: 'POST', body: JSON.stringify(body) }, token),
  dashboard: (token) => request('/api/student/dashboard', {}, token)
};
