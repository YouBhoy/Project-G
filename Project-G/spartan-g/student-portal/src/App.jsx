import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import BookAppointment from './components/student/BookAppointment.jsx';
import ManageAppointments from './components/facilitator/ManageAppointments.jsx';
import ManageSlots from './components/facilitator/ManageSlots.jsx';
import EmergencyContactCard from './components/EmergencyContactCard.jsx';
import EmergencyContactsLegend from './components/EmergencyContactsLegend.jsx';
import SafetyPlan from './components/student/SafetyPlan.jsx';
import MyAppointments from './components/student/MyAppointments.jsx';

const studentModules = {
  gawa: {
    label: 'GAWA (Assessment)',
    pages: [
      { key: 'dass21', label: 'DASS-21' },
      { key: 'phq9', label: 'PHQ-9' },
      { key: 'gad7', label: 'GAD-7' },
      { key: 'esm-checkin', label: 'ESM Check-in' },
      { key: 'dashboard', label: 'Dashboard' }
    ]
  },
  gabay: {
    label: 'GABAY (Referral & Guidance)',
    pages: [
      { key: 'book-appointment', label: 'Book Appointment' },
      { key: 'my-appointments', label: 'My Appointments' },
      { key: 'emergency-contacts', label: 'Emergency Contacts' }
    ]
  },
  ginhawa: {
    label: 'GINHAWA (Wellness Resources)',
    pages: [
      { key: 'wellness-resources', label: 'Wellness Resources' },
      { key: 'safety-plan', label: 'Safety Plan' }
    ]
  }
};

const allStudentPages = Object.values(studentModules).flatMap((m) => m.pages);

function normalizeStudentPageKey(input) {
  const allowed = new Set(allStudentPages.map((p) => p.key));
  return allowed.has(input) ? input : 'dass21';
}

function getModuleFromPageKey(pageKey) {
  for (const [moduleKey, module] of Object.entries(studentModules)) {
    if (module.pages.some((p) => p.key === pageKey)) {
      return moduleKey;
    }
  }
  return 'gawa';
}

function readPageFromHash() {
  const raw = window.location.hash.replace('#/', '').trim();
  return normalizeStudentPageKey(raw || 'dass21');
}

function scaleText(value) {
  return {
    0: 'Did not apply',
    1: 'Some of the time',
    2: 'Good part of the time',
    3: 'Most of the time'
  }[value];
}

function riskClassName(riskLevel) {
  if (riskLevel === 'Crisis') return 'risk-badge crisis';
  if (riskLevel === 'High') return 'risk-badge high';
  if (riskLevel === 'Moderate') return 'risk-badge moderate';
  return 'risk-badge low';
}

function yesNo(value) {
  return value ? 'Yes' : 'No';
}

const wellnessVideos = [
  {
    videoId: 'AOaIuwR0wyQ',
    title: 'Pag-unawa sa Anxiety',
    source: 'PinoyPsych101',
    description: 'Isang Tagalog na paliwanag tungkol sa anxiety at kung paano ito mas mahusay na maunawaan at mapangasiwaan.',
    language: 'tagalog',
    languageLabel: '🇵🇭 Tagalog'
  },
  {
    videoId: '8Ex6D7OJQNw',
    title: 'Paano Nauuwi sa Depression ang Anxiety Disorder?',
    source: 'UNTV News and Rescue',
    description: 'Tagalog explainer sa koneksyon ng anxiety at depression at bakit mahalagang makakuha ng maagang suporta.',
    language: 'tagalog',
    languageLabel: '🇵🇭 Tagalog'
  },
  {
    videoId: 'R18LEjnpVQM',
    title: 'Paano Pakalmahin ang Utak',
    source: 'Doc Willie & Liza 2nd Channel',
    description: 'Praktikal na Tagalog tips para sa stress, anxiety, at panic attack relief sa pang-araw-araw na buhay.',
    language: 'tagalog',
    languageLabel: '🇵🇭 Tagalog'
  },
  {
    videoId: '6p_yaNFSYao',
    title: 'I May Have Anxiety',
    source: 'Psych2Go',
    description: 'A clear look at common anxiety signs and why they deserve attention.',
    language: 'english',
    languageLabel: '🌐 English'
  },
  {
    videoId: '3QIfkeA6HBY',
    title: 'How to Stop Feeling Anxious About Anxiety',
    source: 'Therapy in a Nutshell',
    description: 'Practical guidance for reducing the fear cycle that can build around anxiety itself.',
    language: 'english',
    languageLabel: '🌐 English'
  },
  {
    videoId: 'z-IR48Mb3W0',
    title: 'What is Depression?',
    source: 'TED-Ed',
    description: 'An educational overview of depression, its causes, symptoms, and why seeking help matters for mental wellness.',
    language: 'english',
    languageLabel: '🌐 English'
  },
  {
    videoId: 'WuyPuH9ojCE',
    title: 'Managing Stress & Mental Health',
    source: 'Wellness',
    description: 'Tips for managing daily stress while protecting overall mental well-being.',
    language: 'english',
    languageLabel: '🌐 English'
  }
];

export default function App() {
  const [mode, setMode] = useState('login');
  const [authRole, setAuthRole] = useState('student');
  const [sessionRole, setSessionRole] = useState('student');
  const [token, setToken] = useState('');
  const [student, setStudent] = useState(null);
  const [facilitator, setFacilitator] = useState(null);
  const [activePage, setActivePage] = useState(readPageFromHash());
  const [activeModule, setActiveModule] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [dassAnswers, setDassAnswers] = useState({});
  const [lastDassResult, setLastDassResult] = useState(null);
  const [lastEsmResult, setLastEsmResult] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [ogcDashboard, setOgcDashboard] = useState(null);
  const [ogcTab, setOgcTab] = useState('analytics');
  const [ogcAppointments, setOgcAppointments] = useState([]);
  const [ogcAvailabilitySlots, setOgcAvailabilitySlots] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [studentAppointments, setStudentAppointments] = useState([]);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentCheckboxTicked, setConsentCheckboxTicked] = useState(false);
  const [wellnessVideoFilter, setWellnessVideoFilter] = useState('all');
  const [activeWellnessVideoId, setActiveWellnessVideoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [signupForm, setSignupForm] = useState({
    role: 'student',
    studentId: '',
    name: '',
    email: '',
    password: '',
    college: '',
    yearLevel: 1,
    sex: 'M',
    assignedCollege: 'All'
  });

  const [loginForm, setLoginForm] = useState({ role: 'student', studentId: '', email: '', password: '' });

  const [phq9, setPhq9] = useState({});
  const [gad7, setGad7] = useState({});
  const [lastPhq9Result, setLastPhq9Result] = useState(null);
  const [lastGad7Result, setLastGad7Result] = useState(null);
  const [esm, setEsm] = useState({
    moodScore: 5,
    energyScore: 5,
    stressorCategory: 'academic',
    physicalSymptom: false,
    helpIntent: false
  });

  const canTakeAssessments = Boolean(student?.consentFlag);
  const sortedQuestions = useMemo(() => [...questions].sort((a, b) => a.itemNumber - b.itemNumber), [questions]);
  const filteredWellnessVideos = useMemo(() => {
    if (wellnessVideoFilter === 'all') {
      return wellnessVideos;
    }

    return wellnessVideos.filter((video) => video.language === wellnessVideoFilter);
  }, [wellnessVideoFilter]);

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        if (sessionRole === 'student') {
          const me = await api.me(token);
          setStudent(me);
          setShowConsentModal(!me.consentFlag);
        } else {
          const me = await api.ogcMe(token);
          setFacilitator(me);
          setShowConsentModal(false);
        }
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [token, sessionRole]);

  useEffect(() => {
    if (!token || sessionRole !== 'ogc') return undefined;

    let cancelled = false;

    const loadOgcDashboard = async () => {
      try {
        const data = await api.ogcDashboard(token);
        if (!cancelled) {
          setOgcDashboard(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    };

    loadOgcDashboard();
    const intervalId = window.setInterval(loadOgcDashboard, 10000);
    const handleFocus = () => {
      loadOgcDashboard();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadOgcDashboard();
      }
    };
    const handleStorage = (event) => {
      if (event.key === 'spartan-g:last-signup-at') {
        loadOgcDashboard();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [token, sessionRole]);

  useEffect(() => {
    if (!token || sessionRole !== 'student') return;
    if (activePage === 'book-appointment') {
      run(async () => {
        const data = await api.getAvailableSlots(token);
        setAvailableSlots(data.availableSlots || []);
      });
    }
  }, [activePage, token, sessionRole]);

  useEffect(() => {
    if (!token || sessionRole !== 'student') return;
    if (activePage === 'my-appointments') {
      run(async () => {
        const data = await api.getStudentAppointments(token);
        setStudentAppointments(data.appointments || []);
      });
    }
  }, [activePage, token, sessionRole]);

  useEffect(() => {
    if (!token || sessionRole !== 'student') return;
    if (activePage === 'emergency-contacts') {
      run(async () => {
        const data = await api.getEmergencyContacts();
        setEmergencyContacts(data.emergencyContacts || data.contacts || []);
      });
    }
  }, [activePage, token, sessionRole]);

  useEffect(() => {
    if (!token || sessionRole !== 'ogc') return;
    if (ogcTab === 'slots') {
      run(async () => {
        const result = await api.getOgcAvailabilitySlots(token);
        setOgcAvailabilitySlots(result.slots || []);
      });
    }
  }, [ogcTab, token, sessionRole]);

  useEffect(() => {
    if (!token || sessionRole !== 'ogc') return;
    if (ogcTab === 'appointments') {
      run(async () => {
        const result = await api.getOgcAppointments(token);
        setOgcAppointments(result.appointments || []);
      });
    }
  }, [ogcTab, token, sessionRole]);

  useEffect(() => {
    if (!token || sessionRole !== 'ogc') return;
    if (ogcTab === 'contacts') {
      run(async () => {
        const result = await api.getEmergencyContacts();
        setEmergencyContacts(result.emergencyContacts || result.contacts || []);
      });
    }
  }, [ogcTab, token, sessionRole]);

  useEffect(() => {
    const onHashChange = () => {
      if (sessionRole !== 'student') return;
      const page = readPageFromHash();
      setActivePage(page);
      setActiveModule(getModuleFromPageKey(page));
      if (page === 'dass21') loadQuestionsIfNeeded();
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [sessionRole, token, questions.length]);

  async function run(action) {
    setLoading(true);
    setError('');
    setInfo('');
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function goToPage(pageKey) {
    const safeKey = normalizeStudentPageKey(pageKey);
    window.location.hash = `/${safeKey}`;
    setActivePage(safeKey);
    setActiveModule(getModuleFromPageKey(safeKey));
    if (safeKey === 'dass21') loadQuestionsIfNeeded();
  }

  function goToModule(moduleKey) {
    setActiveModule(moduleKey);
    const firstPage = studentModules[moduleKey].pages[0];
    if (firstPage) {
      goToPage(firstPage.key);
    }
  }

  function handleLoginSubmit(e) {
    e.preventDefault();
    run(async () => {
      const payload = loginForm.role === 'student'
        ? { role: 'student', studentId: loginForm.studentId, password: loginForm.password }
        : { role: 'ogc', email: loginForm.email, password: loginForm.password };

      const data = await api.login(payload);
      const role = data.role || loginForm.role;
      setToken(data.token);
      setSessionRole(role);
      setMode('app');

      if (role === 'student') {
        setStudent(data.student || null);
        setFacilitator(null);
        goToPage(readPageFromHash());
        setShowConsentModal(!data.student?.consentFlag);
      } else {
        setFacilitator(data.facilitator || null);
        setStudent(null);
        setOgcDashboard(null);
      }
    });
  }

  function handleSignupSubmit(e) {
    e.preventDefault();
    run(async () => {
      const payload = signupForm.role === 'student'
        ? {
            role: 'student',
            studentId: signupForm.studentId,
            name: signupForm.name,
            email: signupForm.email,
            password: signupForm.password,
            college: signupForm.college,
            yearLevel: signupForm.yearLevel,
            sex: signupForm.sex
          }
        : {
            role: 'ogc',
            name: signupForm.name,
            email: signupForm.email,
            password: signupForm.password,
            assignedCollege: signupForm.assignedCollege || 'All'
          };

      const data = await api.signup(payload);
      localStorage.setItem('spartan-g:last-signup-at', new Date().toISOString());

      // For students, immediately log them in and show consent form
      if (signupForm.role === 'student' && data?.token) {
        setToken(data.token);
        setSessionRole('student');
        setStudent(data.student || null);
        setFacilitator(null);
        setMode('app');
        setShowConsentModal(true); // Show consent form immediately
        goToPage('consent');
      } else if (signupForm.role === 'ogc' && data?.token) {
        // For OGC facilitators, log them in and go to dashboard
        setToken(data.token);
        setSessionRole('ogc');
        setFacilitator(data.facilitator || null);
        setStudent(null);
        setMode('app');
        goToPage('dashboard');
      } else {
        // Fallback to login screen
        setMode('login');
        setInfo('Account created. You can now log in.');
        setLoginForm((prev) => ({
          ...prev,
          role: signupForm.role,
          studentId: signupForm.role === 'student' ? signupForm.studentId : '',
          email: signupForm.role === 'ogc' ? signupForm.email : '',
          password: ''
        }));
      }
    });
  }

  function loadQuestionsIfNeeded() {
    if (questions.length > 0 || sessionRole !== 'student') return;
    run(async () => {
      const data = await api.dassQuestions(token);
      setQuestions(data.questions);
      const seeded = {};
      data.questions.forEach((q) => {
        seeded[q.itemNumber] = 0;
      });
      setDassAnswers(seeded);
    });
  }

  function submitConsent(consent) {
    run(async () => {
      const data = await api.setConsent(consent, token);
      setStudent((prev) => ({ ...prev, consentFlag: data.consentFlag }));
      setConsentCheckboxTicked(false);
      setShowConsentModal(!data.consentFlag);
      if (data.consentFlag) goToPage('dass21');
    });
  }

  function submitDass() {
    run(async () => {
      const responses = Object.entries(dassAnswers).map(([itemNumber, score]) => ({
        itemNumber: Number(itemNumber),
        score: Number(score)
      }));
      const result = await api.submitDass(responses, token);
      setLastDassResult(result);
      goToPage('dashboard');
    });
  }

  function submitPhq9() {
    run(async () => {
      const scores = Object.entries(phq9).map(([k, v]) => ({
        itemNumber: parseInt(k.replace('item', ''), 10),
        score: Number(v)
      }));
      const result = await api.submitPhq9({ scores }, token);
      setLastPhq9Result(result);
      goToPage('dashboard');
    });
  }

  function submitGad7() {
    run(async () => {
      const scores = Object.entries(gad7).map(([k, v]) => ({
        itemNumber: parseInt(k.replace('item', ''), 10),
        score: Number(v)
      }));
      const result = await api.submitGad7({ scores }, token);
      setLastGad7Result(result);
      goToPage('dashboard');
    });
  }

  function submitEsm() {
    run(async () => {
      const result = await api.submitEsm(esm, token);
      setLastEsmResult(result);
      goToPage('dashboard');
    });
  }

  function refreshDashboard() {
    run(async () => {
      const data = await api.dashboard(token);
      setDashboard(data);
    });
  }

  function refreshOgcDashboard() {
    run(async () => {
      const data = await api.ogcDashboard(token);
      setOgcDashboard(data);
    });
  }

  function contactCriticalStudent(studentId) {
    run(async () => {
      const data = await api.ogcContact({ studentId, channel: 'Email' }, token);
      setInfo(data.message || 'Contact action logged.');
      await refreshOgcDashboard();
    });
  }

  function logout() {
    setToken('');
    setStudent(null);
    setFacilitator(null);
    setSessionRole('student');
    setMode('login');
    setDashboard(null);
    setOgcDashboard(null);
    setLastDassResult(null);
    setLastCssrsResult(null);
    setLastEsmResult(null);
    setQuestions([]);
    setDassAnswers({});
    setShowConsentModal(false);
    setError('');
    setInfo('');
  }

  if (mode !== 'app') {
    return (
      <>
        <header className="inst-header">
          <div className="inst-logo"><img src="/assets/Batangas_State_Logo.png" alt="Batangas State University seal" /></div>
          <div className="inst-wordmark">
            <span>BATANGAS STATE UNIVERSITY</span>
            <span className="tagline">The National Engineering University</span>
          </div>
        </header>

        <main className="shell">
          <section className="card auth-card">
            <div className="auth-banner">
              <div className="inst-logo"><img src="/assets/Batangas_State_Logo.png" alt="Batangas State University seal" /></div>
              <h1>SPARTAN-G Portal</h1>
              <p>Student assessment and OGC facilitator prototype portal.</p>
            </div>

            <div className="auth-body">
              <div className="switch-row">
                <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">Login</button>
                <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')} type="button">Sign Up</button>
              </div>

              {mode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="form-grid">
                  <label>
                    Login As
                    <select
                      value={loginForm.role}
                      onChange={(e) => {
                        const nextRole = e.target.value;
                        setLoginForm((p) => ({ ...p, role: nextRole }));
                        setAuthRole(nextRole);
                      }}
                    >
                      <option value="student">Student</option>
                      <option value="ogc">OGC Facilitator</option>
                    </select>
                  </label>

                  {loginForm.role === 'student' ? (
                    <label>
                      Student ID
                      <input value={loginForm.studentId} onChange={(e) => setLoginForm((p) => ({ ...p, studentId: e.target.value }))} required />
                    </label>
                  ) : (
                    <label>
                      OGC Email
                      <input type="email" value={loginForm.email} onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))} required />
                    </label>
                  )}

                  <label>
                    Password
                    <input type="password" value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} required />
                  </label>
                  <button disabled={loading} type="submit">{loading ? 'Logging in...' : 'Login'}</button>
                </form>
              ) : (
                <form onSubmit={handleSignupSubmit} className="form-grid">
                  <label>
                    Register As
                    <select value={signupForm.role} onChange={(e) => setSignupForm((p) => ({ ...p, role: e.target.value }))}>
                      <option value="student">Student</option>
                      <option value="ogc">OGC Facilitator</option>
                    </select>
                  </label>

                  {signupForm.role === 'student' ? (
                    <>
                      <label>
                        Student ID
                        <input value={signupForm.studentId} onChange={(e) => setSignupForm((p) => ({ ...p, studentId: e.target.value }))} required />
                      </label>
                      <label>
                        Full Name
                        <input value={signupForm.name} onChange={(e) => setSignupForm((p) => ({ ...p, name: e.target.value }))} required />
                      </label>
                      <label>
                        Email (optional)
                        <input value={signupForm.email} onChange={(e) => setSignupForm((p) => ({ ...p, email: e.target.value }))} />
                      </label>
                      <label>
                        Password
                        <input type="password" value={signupForm.password} onChange={(e) => setSignupForm((p) => ({ ...p, password: e.target.value }))} required />
                      </label>
                      <label>
                        College
                        <input value={signupForm.college} onChange={(e) => setSignupForm((p) => ({ ...p, college: e.target.value }))} required />
                      </label>
                      <label>
                        Year Level
                        <input type="number" min="1" max="8" value={signupForm.yearLevel} onChange={(e) => setSignupForm((p) => ({ ...p, yearLevel: Number(e.target.value) }))} required />
                      </label>
                      <label>
                        Sex
                        <select value={signupForm.sex} onChange={(e) => setSignupForm((p) => ({ ...p, sex: e.target.value }))}>
                          <option value="M">M</option>
                          <option value="F">F</option>
                        </select>
                      </label>
                    </>
                  ) : (
                    <>
                      <label>
                        Facilitator Name
                        <input value={signupForm.name} onChange={(e) => setSignupForm((p) => ({ ...p, name: e.target.value }))} required />
                      </label>
                      <label>
                        OGC Email
                        <input type="email" value={signupForm.email} onChange={(e) => setSignupForm((p) => ({ ...p, email: e.target.value }))} required />
                      </label>
                      <label>
                        Password
                        <input type="password" value={signupForm.password} onChange={(e) => setSignupForm((p) => ({ ...p, password: e.target.value }))} required />
                      </label>
                      <label>
                        Assigned College
                        <input value={signupForm.assignedCollege} onChange={(e) => setSignupForm((p) => ({ ...p, assignedCollege: e.target.value }))} required />
                      </label>
                    </>
                  )}

                  <button disabled={loading} type="submit">{loading ? 'Creating...' : 'Create account'}</button>
                </form>
              )}

              {error ? <p className="error">{error}</p> : null}
              {info ? <p>{info}</p> : null}
              <p className="hint">Current login mode: <strong>{authRole === 'student' ? 'Student' : 'OGC Facilitator'}</strong></p>
            </div>
          </section>
        </main>

        <footer className="inst-footer">� {new Date().getFullYear()} Batangas State University � SPARTAN-G Prototype</footer>
      </>
    );
  }

  if (sessionRole === 'ogc') {
    return (
      <>
        <header className="inst-header">
          <div className="inst-logo"><img src="/assets/Batangas_State_Logo.png" alt="Batangas State University seal" /></div>
          <div className="inst-wordmark">
            <span>BATANGAS STATE UNIVERSITY</span>
            <span className="tagline">The National Engineering University</span>
          </div>
          <div className="topbar-actions">
            <button type="button" onClick={refreshOgcDashboard}>Refresh OGC Dashboard</button>
            <button type="button" className="muted-btn" onClick={logout}>Logout</button>
          </div>
        </header>

        <main className="shell app-shell">
          <header className="topbar card">
            <div>
              <h1>OGC Facilitator Dashboard</h1>
              <p>{facilitator?.name} ({facilitator?.email})</p>
              <p>Scope: {facilitator?.assignedCollege || 'All'}</p>
            </div>
          </header>

          <nav className="ogc-tabs card">
            <button type="button" className={`tab-btn ${ogcTab === 'analytics' ? 'active' : ''}`} onClick={() => setOgcTab('analytics')}>Analytics</button>
            <button type="button" className={`tab-btn ${ogcTab === 'slots' ? 'active' : ''}`} onClick={() => setOgcTab('slots')}>Manage Slots</button>
            <button type="button" className={`tab-btn ${ogcTab === 'appointments' ? 'active' : ''}`} onClick={() => setOgcTab('appointments')}>Appointments</button>
            <button type="button" className={`tab-btn ${ogcTab === 'contacts' ? 'active' : ''}`} onClick={() => setOgcTab('contacts')}>Emergency Contacts</button>
          </nav>

          <section className="card">
            {ogcTab === 'analytics' && (
              <>
                <h2>Pseudonymized Student Analytics</h2>
                <p>Student identities are hidden by default. Identity is only revealed for Crisis-level contact action.</p>
                <button type="button" onClick={refreshOgcDashboard} disabled={loading}>{loading ? 'Refreshing...' : 'Load Analytics'}</button>

            {ogcDashboard ? (
              <div className="dashboard-wrap">
                {/* Tab Navigation */}
                <div className="ogc-tabs">
                  <button className={`tab-btn ${ogcTab === 'analytics' ? 'active' : ''}`} onClick={() => setOgcTab('analytics')}>Analytics</button>
                  <button className={`tab-btn ${ogcTab === 'slots' ? 'active' : ''}`} onClick={() => setOgcTab('slots')}>Slots</button>
                  <button className={`tab-btn ${ogcTab === 'appointments' ? 'active' : ''}`} onClick={() => setOgcTab('appointments')}>Appointments</button>
                  <button className={`tab-btn ${ogcTab === 'contacts' ? 'active' : ''}`} onClick={() => setOgcTab('contacts')}>Emergency Contacts</button>
                </div>

                {/* Analytics Tab */}
                {ogcTab === 'analytics' && (
                  <>
                    <div className="hero-metrics">
                      <article className="metric-card"><h3>Total Students</h3><p>{ogcDashboard.summary?.totalStudents || 0}</p></article>
                      <article className="metric-card"><h3>Critical Alerts</h3><p>{ogcDashboard.summary?.criticalCount || 0}</p></article>
                      <article className="metric-card"><h3>High Risk</h3><p>{ogcDashboard.summary?.riskCounts?.High || 0}</p></article>
                    </div>

                    <article className="summary-card full-width">
                      <h3>Critical Awareness Queue</h3>
                      {ogcDashboard.criticalAlerts?.length ? (
                        <div className="ogc-list">
                          {ogcDashboard.criticalAlerts.map((alert) => (
                            <div key={`${alert.pseudoId}-${alert.latestClassificationAt}`} className="ogc-item">
                              <p><strong>{alert.pseudoId}</strong> – Crisis classification at {new Date(alert.latestClassificationAt).toLocaleString()}</p>
                              {alert.contact?.canContact ? (
                                <button type="button" onClick={() => contactCriticalStudent(alert.contact.studentId)}>Contact Student</button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : <p>No crisis alerts right now.</p>}
                    </article>

                    <article className="summary-card full-width">
                      <h3>Student Risk Overview</h3>
                      {ogcDashboard.students?.length ? (
                        <div className="ogc-table-wrap">
                          <table className="ogc-table">
                            <thead>
                              <tr>
                                <th>Pseudonym ID</th>
                                <th>College</th>
                                <th>Year</th>
                                <th>Risk</th>
                                <th>Trajectory</th>
                                <th>Avg Mood</th>
                                <th>Avg Energy</th>
                                <th>Latest Assessment</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ogcDashboard.students.map((row) => (
                                <tr key={`${row.pseudoId}-${row.latestClassificationAt || 'none'}`}>
                                  <td>{row.pseudoId}</td>
                                  <td>{row.college}</td>
                                  <td>{row.yearLevel}</td>
                                  <td><span className={riskClassName(row.latestRiskLevel)}>{row.latestRiskLevel}</span></td>
                                  <td>{row.latestTrajectory || 'Stable'}</td>
                                  <td>{row.averageMood ?? '-'}</td>
                                  <td>{row.averageEnergy ?? '-'}</td>
                                  <td>{row.latestClassificationAt ? new Date(row.latestClassificationAt).toLocaleString() : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <p>No student data in scope yet.</p>}
                    </article>
                  </>
                )}

                {/* Slots Tab */}
                {ogcTab === 'slots' && (
                  <ManageSlots facilitator={facilitator} />
                )}

                {/* Appointments Tab */}
                {ogcTab === 'appointments' && (
                  <ManageAppointments facilitator={facilitator} />
                )}

                {/* Emergency Contacts Tab */}
                {ogcTab === 'contacts' && (
                  <>
                    <article className="summary-card full-width">
                      <h3>Emergency Contacts</h3>
                      <form className="form-row" onSubmit={(e) => { e.preventDefault(); }}>
                        <div className="form-group">
                          <label htmlFor="contact-name">Contact Name</label>
                          <input type="text" id="contact-name" placeholder="e.g., Campus Security" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="contact-type">Type</label>
                          <select id="contact-type">
                            <option value="">Select Type</option>
                            <option value="security">Campus Security</option>
                            <option value="medical">Medical</option>
                            <option value="counseling">Counseling</option>
                            <option value="admin">Administration</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor="contact-phone">Phone</label>
                          <input type="tel" id="contact-phone" placeholder="Phone number" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="contact-email">Email</label>
                          <input type="email" id="contact-email" placeholder="Email address" />
                        </div>
                        <button type="submit">Add Contact</button>
                      </form>

                      <h4 style={{ marginTop: '2rem' }}>Current Emergency Contacts</h4>
                      {emergencyContacts?.length ? (
                        <div className="ogc-table-wrap">
                          <table className="ogc-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {emergencyContacts.map((contact, idx) => (
                                <tr key={idx}>
                                  <td>{contact.name}</td>
                                  <td>{contact.type}</td>
                                  <td>{contact.phone}</td>
                                  <td>{contact.email}</td>
                                  <td><button type="button" className="muted-btn">Edit</button> <button type="button" className="muted-btn">Delete</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <p>No emergency contacts configured yet.</p>}
                    </article>
                  </>
                )}
              </div>
            ) : <p>Load the dashboard to see anonymized analytics.</p>}
              </>
            )}

            {ogcTab === 'slots' && (
              <ManageSlots facilitator={facilitator} />
            )}

            {ogcTab === 'appointments' && (
              <ManageAppointments facilitator={facilitator} />
            )}

            {ogcTab === 'contacts' && (
              <>
                <h2>Emergency Contacts</h2>
                <p>Pre-configured emergency resources available to all students.</p>
                <EmergencyContactsLegend />
                {emergencyContacts.length === 0 && !loading ? <p className="info-message">Loading emergency contacts...</p> : null}
                {emergencyContacts.length ? (
                  <div className="contacts-grid">{emergencyContacts.map((contact) => (<EmergencyContactCard key={contact.contactId} contact={contact} />))}</div>
                ) : <p>No contacts loaded.</p>}
              </>
            )}
          </section>
        </main>

        <footer className="inst-footer">� {new Date().getFullYear()} Batangas State University � OGC Facilitator Prototype</footer>
      </>
    );
  }

  return (
    <>
      <header className="inst-header">
        <button type="button" className="hamburger-menu" onClick={() => setMenuOpen(!menuOpen)} title="Toggle Menu">☰</button>
        <div className="header-brand">
          <div className="inst-logo"><img src="/assets/Batangas_State_Logo.png" alt="Batangas State University seal" /></div>
          <div className="inst-wordmark">
            <span>BATANGAS STATE UNIVERSITY</span>
            <span className="tagline">The National Engineering University</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button type="button" className="muted-btn" onClick={() => setShowConsentModal(true)}>Manage Consent</button>
          <button type="button" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="shell app-shell">
        {menuOpen && (
          <nav className="modules-sidebar">
            {Object.entries(studentModules).map(([moduleKey, module]) => (
              <button
                key={moduleKey}
                type="button"
                className={`module-button ${activeModule === moduleKey ? 'active' : ''} ${moduleKey}`}
                onClick={() => {
                  goToModule(moduleKey);
                  setMenuOpen(false);
                }}
                title={module.label}
              >
                {module.label}
              </button>
            ))}
          </nav>
        )}

        <div className="content-area">
          <header className="topbar card">
            <div>
              <h1>Student Wellbeing Assessment</h1>
              <p>{student?.name} ({student?.studentId})</p>
            </div>
          </header>

          {activeModule && (
            <nav className="module-pages-nav card">
              <div className="pages-header">
                <h2>{studentModules[activeModule]?.label}</h2>
              </div>
              <div className="pages-list">
                {studentModules[activeModule]?.pages.map((page) => {
                  const blocked = !canTakeAssessments && page.key !== 'dashboard' && page.key !== 'book-appointment' && page.key !== 'emergency-contacts' && page.key !== 'my-appointments';
                  return (
                    <button
                      key={page.key}
                      type="button"
                      onClick={() => goToPage(page.key)}
                      disabled={blocked}
                      className={`page-item ${activePage === page.key ? 'active' : ''}`}
                      title={blocked ? 'Consent required first' : ''}
                    >
                      {page.label}
                    </button>
                  );
                })}
              </div>
            </nav>
          )}

          {showConsentModal ? (
            <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Digital Informed Consent">
              <section className="modal-card consent-modal">
                <div className="modal-header consent-modal-header">
                  <h2>Digital Informed Consent (Required)</h2>
                  <p className="consent-subtitle">BatStateU Mental Health Assessment System - Data Collection & Processing Agreement</p>
                </div>
                <div className="modal-body consent-modal-body">
                  <div className="consent-status">
                    <span className="status-label">Consent Status:</span>
                    <span className={`status-badge ${student?.consentFlag ? 'consented' : 'not-consented'}`}>
                      {student?.consentFlag ? 'Consented' : 'Not Consented'}
                    </span>
                  </div>

                  <div className="consent-content">
                    <section className="consent-section">
                      <h3>📋 Purpose of Data Collection</h3>
                      <p>
                        Responses from mental health assessments (DASS-21, PHQ-9, GAD-7, and ESM Check-in) will be collected and processed to:
                      </p>
                      <ul>
                        <li>Monitor your mental health and well-being during your academic journey</li>
                        <li>Provide personalized referrals to campus counseling and support services</li>
                        <li>Conduct academic research to improve student mental health programs</li>
                        <li>Enhance wellness initiatives and support services at Batangas State University</li>
                      </ul>
                    </section>

                    <section className="consent-section">
                      <h3>📊 What Data is Collected</h3>
                      <p>The following personal data will be collected and processed:</p>
                      <ul>
                        <li><strong>Assessment Responses:</strong> Your answers to DASS-21, PHQ-9, GAD-7, and ESM questions</li>
                        <li><strong>Timestamps:</strong> When assessments were completed</li>
                        <li><strong>User Identifiers:</strong> Your student ID, name, email, and college affiliation</li>
                        <li><strong>Derived Scores:</strong> Mental health risk classifications and wellness metrics calculated from your responses</li>
                        <li><strong>Appointment Data:</strong> Booking and attendance records for counseling sessions (if applicable)</li>
                      </ul>
                    </section>

                    <section className="consent-section">
                      <h3>💼 How Data Will Be Used</h3>
                      <ul>
                        <li>Data will be used <strong>only for the stated purposes</strong> above</li>
                        <li>Individual assessment results will <strong>not be sold, traded, or shared with unauthorized third parties</strong></li>
                        <li>Data may be used for <strong>aggregate and anonymized research</strong> to improve university wellness programs</li>
                        <li>Results may be shared with campus counseling services <strong>only when necessary to provide support</strong></li>
                        <li>In cases of immediate risk (crisis), results may be shared with emergency services and campus authorities</li>
                      </ul>
                    </section>

                    <section className="consent-section">
                      <h3>🔒 Data Confidentiality & Security</h3>
                      <p>
                        Batangas State University employs appropriate technical and organizational measures to protect your data, including:
                      </p>
                      <ul>
                        <li>Encryption of data in transit and at rest</li>
                        <li>Secure authentication and access controls</li>
                        <li>Regular security audits and updates</li>
                        <li><strong>Only authorized personnel</strong> (designated mental health professionals, counselors, and administrators) may access your individual assessment results</li>
                        <li>Data retention policies compliant with Philippine regulations</li>
                      </ul>
                    </section>

                    <section className="consent-section">
                      <h3>⚖️ Your Rights Under the Data Privacy Act of 2012 (Republic Act No. 10173)</h3>
                      <p>As a data subject in the Philippines, you have the following rights:</p>
                      <ul>
                        <li><strong>Right to be Informed:</strong> You have the right to know what personal data is being collected and how it will be used</li>
                        <li><strong>Right to Access:</strong> You may request access to your personal data at any time</li>
                        <li><strong>Right to Correct:</strong> You may request correction of inaccurate or incomplete data</li>
                        <li><strong>Right to Object:</strong> You may object to the processing of your data for specific purposes</li>
                        <li><strong>Right to Erase or Block:</strong> You may request erasure or blocking of your data under certain circumstances</li>
                        <li><strong>Right to Data Portability:</strong> You may request your data in a structured, commonly used format</li>
                        <li><strong>Right to Lodge a Complaint:</strong> You may file a complaint with the National Privacy Commission (NPC) regarding violations of your data privacy rights</li>
                      </ul>
                    </section>

                    <section className="consent-section">
                      <h3>✋ Voluntary Participation & Withdrawal</h3>
                      <ul>
                        <li>Your consent to participate in the assessment system is <strong>completely voluntary</strong></li>
                        <li>You may <strong>withdraw your consent at any time</strong> without penalty or loss of benefits</li>
                        <li>If you withdraw consent, <strong>access to assessments will be restricted</strong> until you provide consent again</li>
                        <li>Withdrawing consent does not affect the lawfulness of processing before withdrawal</li>
                        <li>You may manage your consent status at any time via the "Manage Consent" button on the dashboard</li>
                      </ul>
                    </section>

                    <section className="consent-section">
                      <h3>📞 Contact & Data Protection Officer</h3>
                      <p>For privacy-related concerns, requests, or to exercise your rights under the Data Privacy Act, please contact:</p>
                      <div className="dpo-contact">
                        <p>
                          <strong>BatStateU Data Protection Officer (DPO)</strong><br/>
                          Batangas State University<br/>
                          Email: <a href="mailto:privacy@batstateu.edu.ph">privacy@batstateu.edu.ph</a><br/>
                          Office: Records Management Office<br/>
                          <br/>
                          <strong>National Privacy Commission (NPC)</strong><br/>
                          <a href="https://privacy.gov.ph" target="_blank" rel="noopener noreferrer">https://privacy.gov.ph</a><br/>
                          Toll-free: 1-646-472-5555
                        </p>
                      </div>
                    </section>

                    <section className="consent-section">
                      <h3>📝 Policy References</h3>
                      <p>
                        This consent form is based on:
                      </p>
                      <ul>
                        <li>Data Privacy Act of 2012 (Republic Act No. 10173) of the Philippines</li>
                        <li><a href="https://batstateu.edu.ph/privacy-policy/" target="_blank" rel="noopener noreferrer">BatStateU Privacy Policy</a></li>
                        <li>BatStateU Institutional Review Board (IRB) guidelines for research ethics</li>
                      </ul>
                    </section>
                  </div>

                  <div className="consent-footer">
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={consentCheckboxTicked}
                          onChange={(e) => setConsentCheckboxTicked(e.target.checked)}
                          className="consent-checkbox"
                        />
                        <span>I have read and understood the above terms and I <strong>voluntarily give my consent</strong> to the collection and processing of my personal data as described.</span>
                      </label>
                    </div>

                    <div className="consent-actions">
                      <button 
                        type="button" 
                        onClick={() => submitConsent(true)} 
                        disabled={loading || !consentCheckboxTicked}
                        className="consent-btn consent-agree"
                      >
                        I Consent
                      </button>
                      <button 
                        type="button" 
                        className="consent-btn consent-withdraw" 
                        onClick={() => submitConsent(false)} 
                        disabled={loading}
                      >
                        Withdraw Consent
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {activePage === 'dass21' ? (
            <section className="card">
              <h2>DASS-21</h2>
              {!canTakeAssessments ? <p className="error">Consent required before DASS-21.</p> : null}
            <p>21 items, each scored 0-3.</p>
            <button type="button" onClick={loadQuestionsIfNeeded} disabled={loading || !canTakeAssessments}>{questions.length ? 'Reload Questions' : 'Load Questions'}</button>
            <div className="question-list">
              {sortedQuestions.map((q) => (
                <label key={q.itemNumber} className="question-item">
                  <span><strong>Q{q.itemNumber}</strong> ({q.subscale}) - {q.text}</span>
                  <select value={dassAnswers[q.itemNumber] ?? 0} onChange={(e) => setDassAnswers((prev) => ({ ...prev, [q.itemNumber]: Number(e.target.value) }))} disabled={!canTakeAssessments}>
                    {[0, 1, 2, 3].map((v) => <option key={v} value={v}>{v} - {scaleText(v)}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <button type="button" onClick={submitDass} disabled={!canTakeAssessments || loading || Object.keys(dassAnswers).length !== 21}>{loading ? 'Submitting...' : 'Submit DASS-21'}</button>
            {lastDassResult ? <p>Latest risk result: <span className={riskClassName(lastDassResult.riskLevel)}>{lastDassResult.riskLevel}</span></p> : null}
            </section>
          ) : null}

          {activePage === 'phq9' ? (
            <section className="card">
              <h2>PHQ-9 (Patient Health Questionnaire)</h2>
            {!canTakeAssessments ? <p className="error">Consent required before PHQ-9.</p> : null}
            <p>Over the last 2 weeks, how often have you been bothered by each of the following problems?</p>
            <div className="form-grid">
              {[
                { num: 1, text: 'Little interest or pleasure in doing things' },
                { num: 2, text: 'Feeling down, depressed, or hopeless' },
                { num: 3, text: 'Trouble falling or staying asleep, or sleeping too much' },
                { num: 4, text: 'Feeling tired or having little energy' },
                { num: 5, text: 'Poor appetite or overeating' },
                { num: 6, text: 'Feeling bad about yourself or that you are a failure' },
                { num: 7, text: 'Trouble concentrating on things' },
                { num: 8, text: 'Moving or speaking slowly, or being fidgety or restless' },
                { num: 9, text: 'Thoughts that you would be better off dead' }
              ].map((q) => (
                <label key={q.num}>
                  <strong>Item {q.num}:</strong> {q.text}
                  <select value={phq9[`item${q.num}`] ?? 0} onChange={(e) => setPhq9((prev) => ({ ...prev, [`item${q.num}`]: Number(e.target.value) }))} disabled={!canTakeAssessments}>
                    <option value="0">Not at all (0)</option>
                    <option value="1">Several days (1)</option>
                    <option value="2">More than half the days (2)</option>
                    <option value="3">Nearly every day (3)</option>
                  </select>
                </label>
              ))}
            </div>
            <button type="button" onClick={submitPhq9} disabled={!canTakeAssessments || loading || Object.keys(phq9).length !== 9}>{loading ? 'Submitting...' : 'Submit PHQ-9'}</button>
              {lastPhq9Result ? <p>Depression Risk: <span className={riskClassName(lastPhq9Result.riskLevel)}>{lastPhq9Result.riskLevel}</span></p> : null}
            </section>
          ) : null}

          {activePage === 'gad7' ? (
          <section className="card">
            <h2>GAD-7 (Generalized Anxiety Disorder)</h2>
            {!canTakeAssessments ? <p className="error">Consent required before GAD-7.</p> : null}
            <p>Over the last 2 weeks, how often have you been bothered by each of the following problems?</p>
            <div className="form-grid">
              {[
                { num: 1, text: 'Feeling nervous, anxious or on edge' },
                { num: 2, text: 'Not being able to stop or control worrying' },
                { num: 3, text: 'Worrying too much about different things' },
                { num: 4, text: 'Trouble relaxing' },
                { num: 5, text: 'Being so restless that it is hard to sit still' },
                { num: 6, text: 'Becoming easily annoyed or irritable' },
                { num: 7, text: 'Feeling afraid as if something awful might happen' }
              ].map((q) => (
                <label key={q.num}>
                  <strong>Item {q.num}:</strong> {q.text}
                  <select value={gad7[`item${q.num}`] ?? 0} onChange={(e) => setGad7((prev) => ({ ...prev, [`item${q.num}`]: Number(e.target.value) }))} disabled={!canTakeAssessments}>
                    <option value="0">Not at all (0)</option>
                    <option value="1">Several days (1)</option>
                    <option value="2">More than half the days (2)</option>
                    <option value="3">Nearly every day (3)</option>
                  </select>
                </label>
              ))}
            </div>
            <button type="button" onClick={submitGad7} disabled={!canTakeAssessments || loading || Object.keys(gad7).length !== 7}>{loading ? 'Submitting...' : 'Submit GAD-7'}</button>
              {lastGad7Result ? <p>Anxiety Risk: <span className={riskClassName(lastGad7Result.riskLevel)}>{lastGad7Result.riskLevel}</span></p> : null}
            </section>
          ) : null}

          {activePage === 'esm-checkin' ? (
          <section className="card">
            <h2>ESM Check-in</h2>
            {!canTakeAssessments ? <p className="error">Consent required before ESM.</p> : null}
            <div className="form-grid">
              <label>
                Mood (1-10)
                <input type="range" min="1" max="10" value={esm.moodScore} onChange={(e) => setEsm((p) => ({ ...p, moodScore: Number(e.target.value) }))} disabled={!canTakeAssessments} />
                <span>{esm.moodScore}</span>
              </label>
              <label>
                Energy (1-10)
                <input type="range" min="1" max="10" value={esm.energyScore} onChange={(e) => setEsm((p) => ({ ...p, energyScore: Number(e.target.value) }))} disabled={!canTakeAssessments} />
                <span>{esm.energyScore}</span>
              </label>
              <label>
                Stressor Category
                <select value={esm.stressorCategory} onChange={(e) => setEsm((p) => ({ ...p, stressorCategory: e.target.value }))} disabled={!canTakeAssessments}>
                  <option value="academic">Academic</option>
                  <option value="social">Social</option>
                  <option value="financial">Financial</option>
                  <option value="health">Health</option>
                </select>
              </label>
            </div>
            <button type="button" onClick={submitEsm} disabled={!canTakeAssessments || loading}>{loading ? 'Submitting...' : 'Submit ESM'}</button>
            {lastEsmResult ? <p>Trajectory: <strong>{lastEsmResult.trajectory?.label || 'Stable'}</strong></p> : null}
          </section>
        ) : null}

        {activePage === 'dashboard' ? (
          <section className="card">
            <h2>Personal Risk Dashboard</h2>
            <button type="button" onClick={refreshDashboard} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh Dashboard'}</button>
            {dashboard ? (
              <div className="dashboard-wrap">
                <div className="hero-metrics">
                  <article className="metric-card"><h3>Current Risk</h3><p><span className={riskClassName(dashboard.riskLevel)}>{dashboard.riskLevel}</span></p></article>
                  <article className="metric-card"><h3>Next Action</h3><p>{dashboard.nextAction}</p></article>
                  <article className="metric-card"><h3>Consent</h3><p>{yesNo(dashboard.student?.consentFlag)}</p></article>
                </div>
              </div>
            ) : <p>No dashboard data loaded yet.</p>}
          </section>
        ) : null}

        {activePage === 'book-appointment' ? (
          <BookAppointment student={student} />
        ) : null}

        {activePage === 'my-appointments' ? (
          <MyAppointments student={student} />
        ) : null}

        {activePage === 'emergency-contacts' ? (
          <section className="card">
            <h2>Emergency Contacts & Hotlines</h2>
            <p>Access immediate mental health support and emergency services.</p>
            <EmergencyContactsLegend />
            {emergencyContacts.length === 0 && !loading ? <p className="info-message">Loading emergency contacts...</p> : null}
            
            {emergencyContacts.length > 0 ? (
              <div className="contacts-grid">
                {emergencyContacts.map((contact) => (
                  <article key={contact.contactId} className="contact-card">
                    <div className="contact-header">
                      <h3>{contact.name}</h3>
                      {contact.available24_7 && <span className="badge">24/7</span>}
                    </div>
                    <p><strong>Type:</strong> {contact.contactType}</p>
                    {contact.phone && <p><strong>Phone:</strong> <a href={`tel:${contact.phone}`}>{contact.phone}</a></p>}
                    {contact.email && <p><strong>Email:</strong> <a href={`mailto:${contact.email}`}>{contact.email}</a></p>}
                    <p><strong>Priority:</strong> <span className={`priority-${contact.priority}`}>{contact.priority}</span></p>
                  </article>
                ))}
              </div>
            ) : <p className="hint">No emergency contacts loaded yet.</p>}
          </section>
        ) : null}

        {activePage === 'wellness-resources' ? (
          <section className="card">
            <div className="wellness-section-header">
              <h2>🎥 Wellness Video Resources</h2>
              <p>Click a thumbnail to play the video inline without leaving the page.</p>
            </div>

            <div className="video-filter-bar" role="tablist" aria-label="Wellness video language filters">
              <button
                type="button"
                className={`video-filter-btn ${wellnessVideoFilter === 'all' ? 'active' : ''}`}
                onClick={() => setWellnessVideoFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`video-filter-btn ${wellnessVideoFilter === 'tagalog' ? 'active' : ''}`}
                onClick={() => setWellnessVideoFilter('tagalog')}
              >
                🇵🇭 Tagalog
              </button>
              <button
                type="button"
                className={`video-filter-btn ${wellnessVideoFilter === 'english' ? 'active' : ''}`}
                onClick={() => setWellnessVideoFilter('english')}
              >
                🌐 English
              </button>
            </div>

            <div className="wellness-video-grid">
              {filteredWellnessVideos.map((video) => {
                const isPlaying = activeWellnessVideoId === video.videoId;
                const thumbnailUrl = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
                const embedUrl = `https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1`;

                return (
                  <article key={video.videoId} className="wellness-video-card card">
                    <button
                      type="button"
                      className="video-thumbnail-button"
                      onClick={() => setActiveWellnessVideoId(video.videoId)}
                      aria-label={`Play ${video.title} by ${video.source}`}
                    >
                      {isPlaying ? (
                        <div className="video-frame-wrap">
                          <iframe
                            src={embedUrl}
                            title={video.title}
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <div className="video-thumb-shell">
                          <img src={thumbnailUrl} alt={`${video.title} thumbnail`} className="video-thumb-image" />
                          <span className="video-play-badge" aria-hidden="true">▶</span>
                        </div>
                      )}
                    </button>

                    <div className="wellness-video-meta">
                      <div className="video-title-row">
                        <h3>{video.title}</h3>
                        <span className={`language-badge ${video.language}`}>{video.languageLabel}</span>
                      </div>
                      <p className="video-source">by {video.source}</p>
                      <p className="video-description">{video.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {activePage === 'safety-plan' ? (
          <SafetyPlan />
        ) : null}

        {error ? <p className="error global-error">{error}</p> : null}
        {info ? <p>{info}</p> : null}
        </div>
      </main>

      <footer className="inst-footer">� {new Date().getFullYear()} Batangas State University � SPARTAN-G Student Wellbeing Portal</footer>
    </>
  );
}
