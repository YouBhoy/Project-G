import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const studentPages = [
  { key: 'dass21', label: 'DASS-21' },
  { key: 'phq9', label: 'PHQ-9' },
  { key: 'gad7', label: 'GAD-7' },
  { key: 'esm-checkin', label: 'ESM Check-in' },
  { key: 'dashboard', label: 'Dashboard' }
];

function normalizeStudentPageKey(input) {
  const allowed = new Set(studentPages.map((p) => p.key));
  return allowed.has(input) ? input : 'dass21';
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

export default function App() {
  const [mode, setMode] = useState('login');
  const [authRole, setAuthRole] = useState('student');
  const [sessionRole, setSessionRole] = useState('student');
  const [token, setToken] = useState('');
  const [student, setStudent] = useState(null);
  const [facilitator, setFacilitator] = useState(null);
  const [activePage, setActivePage] = useState(readPageFromHash());
  const [questions, setQuestions] = useState([]);
  const [dassAnswers, setDassAnswers] = useState({});
  const [lastDassResult, setLastDassResult] = useState(null);
  const [lastEsmResult, setLastEsmResult] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [ogcDashboard, setOgcDashboard] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
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
    const onHashChange = () => {
      if (sessionRole !== 'student') return;
      const page = readPageFromHash();
      setActivePage(page);
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
    if (safeKey === 'dass21') loadQuestionsIfNeeded();
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

      await api.signup(payload);
      localStorage.setItem('spartan-g:last-signup-at', new Date().toISOString());
      setMode('login');
      setInfo('Account created. You can now log in.');
      setLoginForm((prev) => ({
        ...prev,
        role: signupForm.role,
        studentId: signupForm.role === 'student' ? signupForm.studentId : '',
        email: signupForm.role === 'ogc' ? signupForm.email : '',
        password: ''
      }));
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

          <section className="card">
            <h2>Pseudonymized Student Analytics</h2>
            <p>Student identities are hidden by default. Identity is only revealed for Crisis-level contact action.</p>
            <button type="button" onClick={refreshOgcDashboard} disabled={loading}>{loading ? 'Refreshing...' : 'Load Analytics'}</button>

            {ogcDashboard ? (
              <div className="dashboard-wrap">
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
                          <p><strong>{alert.pseudoId}</strong> � Crisis classification at {new Date(alert.latestClassificationAt).toLocaleString()}</p>
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
              </div>
            ) : <p>Load the dashboard to see anonymized analytics.</p>}

            {error ? <p className="error global-error">{error}</p> : null}
            {info ? <p>{info}</p> : null}
          </section>
        </main>

        <footer className="inst-footer">� {new Date().getFullYear()} Batangas State University � OGC Facilitator Prototype</footer>
      </>
    );
  }

  return (
    <>
      <header className="inst-header">
        <div className="inst-logo"><img src="/assets/Batangas_State_Logo.png" alt="Batangas State University seal" /></div>
        <div className="inst-wordmark">
          <span>BATANGAS STATE UNIVERSITY</span>
          <span className="tagline">The National Engineering University</span>
        </div>
        <div className="topbar-actions">
          <button type="button" className="muted-btn" onClick={() => setShowConsentModal(true)}>Manage Consent</button>
          <button type="button" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="shell app-shell">
        <header className="topbar card">
          <div>
            <h1>Student Wellbeing Assessment</h1>
            <p>{student?.name} ({student?.studentId})</p>
          </div>
        </header>

        <nav className="tabs">
          {studentPages.map((page) => {
            const blocked = !canTakeAssessments && page.key !== 'dashboard';
            return (
              <button
                key={page.key}
                type="button"
                onClick={() => goToPage(page.key)}
                disabled={blocked}
                className={activePage === page.key ? 'active' : ''}
                title={blocked ? 'Consent required first' : ''}
              >
                {page.label}
              </button>
            );
          })}
        </nav>

        {showConsentModal ? (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Consent Required">
            <section className="modal-card">
              <div className="modal-header"><h2>Digital Informed Consent (Required)</h2></div>
              <div className="modal-body">
                <p>Before using DASS-21, PHQ-9, GAD-7, or ESM Check-in, you must acknowledge digital informed consent.</p>
                <p>You may withdraw anytime. If withdrawn, assessment access will be blocked until you consent again.</p>
                <p>Status: <strong>{student?.consentFlag ? 'Consented' : 'Not Consented'}</strong></p>
                <div className="row">
                  <button type="button" onClick={() => submitConsent(true)} disabled={loading}>I Consent</button>
                  <button type="button" className="muted-btn" onClick={() => submitConsent(false)} disabled={loading}>Withdraw Consent</button>
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

        {error ? <p className="error global-error">{error}</p> : null}
        {info ? <p>{info}</p> : null}
      </main>

      <footer className="inst-footer">� {new Date().getFullYear()} Batangas State University � SPARTAN-G Student Wellbeing Portal</footer>
    </>
  );
}
