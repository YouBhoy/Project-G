import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const pages = [
  { key: 'dass21', label: 'DASS-21' },
  { key: 'cssrs-lite', label: 'C-SSRS Lite' },
  { key: 'esm-checkin', label: 'ESM Check-in' },
  { key: 'dashboard', label: 'Dashboard' }
];

function normalizePageKey(input) {
  const allowed = new Set(pages.map((p) => p.key));
  return allowed.has(input) ? input : 'dass21';
}

function readPageFromHash() {
  const raw = window.location.hash.replace('#/', '').trim();
  return normalizePageKey(raw || 'dass21');
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
  const [token, setToken] = useState('');
  const [student, setStudent] = useState(null);
  const [activePage, setActivePage] = useState(readPageFromHash());
  const [questions, setQuestions] = useState([]);
  const [dassAnswers, setDassAnswers] = useState({});
  const [lastDassResult, setLastDassResult] = useState(null);
  const [lastCssrsResult, setLastCssrsResult] = useState(null);
  const [lastEsmResult, setLastEsmResult] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [signupForm, setSignupForm] = useState({
    studentId: '',
    name: '',
    email: '',
    password: '',
    college: '',
    yearLevel: 1,
    sex: 'M'
  });

  const [loginForm, setLoginForm] = useState({ studentId: '', password: '' });

  const [cssrs, setCssrs] = useState({ item1: false, item2: false, item3: false });
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
        const me = await api.me(token);
        setStudent(me);
        setShowConsentModal(!me.consentFlag);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [token]);

  useEffect(() => {
    const onHashChange = () => {
      const page = readPageFromHash();
      setActivePage(page);
      if (page === 'dass21') loadQuestionsIfNeeded();
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [token, questions.length]);

  async function run(action) {
    setLoading(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function goToPage(pageKey) {
    const safeKey = normalizePageKey(pageKey);
    window.location.hash = `/${safeKey}`;
    setActivePage(safeKey);
    if (safeKey === 'dass21') loadQuestionsIfNeeded();
  }

  function handleLoginSubmit(e) {
    e.preventDefault();
    run(async () => {
      const data = await api.login(loginForm);
      setToken(data.token);
      setStudent(data.student);
      setMode('app');
      goToPage(readPageFromHash());
      setShowConsentModal(!data.student.consentFlag);
    });
  }

  function handleSignupSubmit(e) {
    e.preventDefault();
    run(async () => {
      await api.signup(signupForm);
      setMode('login');
      setLoginForm({ studentId: signupForm.studentId, password: '' });
    });
  }

  function loadQuestionsIfNeeded() {
    if (questions.length > 0) return;
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

  function submitCssrs() {
    run(async () => {
      const result = await api.submitCssrs(cssrs, token);
      setLastCssrsResult(result);
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

  function logout() {
    setToken('');
    setStudent(null);
    setMode('login');
    setDashboard(null);
    setLastDassResult(null);
    setLastCssrsResult(null);
    setLastEsmResult(null);
    setQuestions([]);
    setDassAnswers({});
    setError('');
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
              <h1>SPARTAN-G Student Side</h1>
              <p>Temporary standalone auth for testing before portal integration.</p>
            </div>

            <div className="auth-body">
              <div className="switch-row">
                <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">Login</button>
                <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')} type="button">Sign Up</button>
              </div>

              {mode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="form-grid">
                  <label>
                    Student ID
                    <input value={loginForm.studentId} onChange={(e) => setLoginForm((p) => ({ ...p, studentId: e.target.value }))} required />
                  </label>
                  <label>
                    Password
                    <input type="password" value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} required />
                  </label>
                  <button disabled={loading} type="submit">{loading ? 'Logging in...' : 'Login'}</button>
                </form>
              ) : (
                <form onSubmit={handleSignupSubmit} className="form-grid">
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
                  <button disabled={loading} type="submit">{loading ? 'Creating...' : 'Create account'}</button>
                </form>
              )}

              {error ? <p className="error">{error}</p> : null}
            </div>
          </section>
        </main>

        <footer className="inst-footer">© {new Date().getFullYear()} Batangas State University — SPARTAN-G Student Wellbeing Portal</footer>
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
          {pages.map((page) => {
            const blocked = !canTakeAssessments && page.key !== 'dashboard';
            return (
              <button
                key={page.key}
                type="button"
                onClick={() => {
                  goToPage(page.key);
                }}
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
            <div className="modal-header">
              <h2>Digital Informed Consent (Required)</h2>
            </div>
            <div className="modal-body">
              <p>
                Before using DASS-21, C-SSRS Lite, or ESM Check-in, you must acknowledge digital informed consent.
              </p>
              <p>
                You may withdraw anytime. If withdrawn, assessment access will be blocked until you consent again.
              </p>
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
          <button type="button" onClick={loadQuestionsIfNeeded} disabled={loading || !canTakeAssessments}>
            {questions.length ? 'Reload Questions' : 'Load Questions'}
          </button>
          <div className="question-list">
            {sortedQuestions.map((q) => (
              <label key={q.itemNumber} className="question-item">
                <span><strong>Q{q.itemNumber}</strong> ({q.subscale}) - {q.text}</span>
                <select
                  value={dassAnswers[q.itemNumber] ?? 0}
                  onChange={(e) => setDassAnswers((prev) => ({ ...prev, [q.itemNumber]: Number(e.target.value) }))}
                  disabled={!canTakeAssessments}
                >
                  {[0, 1, 2, 3].map((v) => (
                    <option key={v} value={v}>{v} - {scaleText(v)}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button type="button" onClick={submitDass} disabled={!canTakeAssessments || loading || Object.keys(dassAnswers).length !== 21}>
            {loading ? 'Submitting...' : 'Submit DASS-21'}
          </button>
          {lastDassResult ? (
            <div className="summary-grid">
              <article className="summary-card">
                <h3>Risk Outcome</h3>
                <p><span className={riskClassName(lastDassResult.riskLevel)}>{lastDassResult.riskLevel}</span></p>
                <p>Generated within 3s: <strong>{yesNo(lastDassResult.generatedWithin3Seconds)}</strong></p>
              </article>

              <article className="summary-card">
                <h3>Subscale Scores</h3>
                <ul className="mini-list">
                  <li>Depression: <strong>{lastDassResult.subscaleScores?.depression}</strong></li>
                  <li>Anxiety: <strong>{lastDassResult.subscaleScores?.anxiety}</strong></li>
                  <li>Stress: <strong>{lastDassResult.subscaleScores?.stress}</strong></li>
                </ul>
              </article>

              <article className="summary-card">
                <h3>Severity Labels</h3>
                <ul className="mini-list">
                  <li>Depression: <strong>{lastDassResult.subscaleLabels?.D}</strong></li>
                  <li>Anxiety: <strong>{lastDassResult.subscaleLabels?.A}</strong></li>
                  <li>Stress: <strong>{lastDassResult.subscaleLabels?.S}</strong></li>
                </ul>
              </article>
            </div>
          ) : null}
        </section>
      ) : null}

      {activePage === 'cssrs-lite' ? (
        <section className="card">
          <h2>C-SSRS Lite</h2>
          {!canTakeAssessments ? <p className="error">Consent required before C-SSRS Lite.</p> : null}
          <p>Key threshold: if item 3 is Yes, Crisis is immediately triggered.</p>
          <div className="form-grid">
            {[1, 2, 3].map((n) => (
              <label key={n}>
                Item {n} (Yes/No)
                <select
                  value={cssrs[`item${n}`] ? 'yes' : 'no'}
                  onChange={(e) => setCssrs((prev) => ({ ...prev, [`item${n}`]: e.target.value === 'yes' }))}
                  disabled={!canTakeAssessments}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
            ))}
          </div>
          <button type="button" onClick={submitCssrs} disabled={!canTakeAssessments || loading}>
            {loading ? 'Submitting...' : 'Submit C-SSRS Lite'}
          </button>
          {lastCssrsResult ? (
            <div className="summary-grid two-col">
              <article className="summary-card">
                <h3>C-SSRS Outcome</h3>
                <p>Crisis Flag: <strong>{yesNo(lastCssrsResult.crisisFlag)}</strong></p>
                {lastCssrsResult.riskLevel ? <p>Risk Level: <span className={riskClassName(lastCssrsResult.riskLevel)}>{lastCssrsResult.riskLevel}</span></p> : null}
                {lastCssrsResult.priorityAlertSent ? <p>Priority alert sent to OGC.</p> : <p>No priority alert triggered.</p>}
              </article>

              <article className="summary-card">
                <h3>Hotlines</h3>
                {Array.isArray(lastCssrsResult.hotline) && lastCssrsResult.hotline.length > 0 ? (
                  <ul className="mini-list">
                    {lastCssrsResult.hotline.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                ) : (
                  <p>Hotline panel appears for crisis cases.</p>
                )}
              </article>
            </div>
          ) : null}
        </section>
      ) : null}

      {activePage === 'esm-checkin' ? (
        <section className="card">
          <h2>ESM Check-in</h2>
          {!canTakeAssessments ? <p className="error">Consent required before ESM.</p> : null}
          <p>Designed to complete within 90 seconds.</p>
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
            <label>
              Physical Symptoms
              <select value={esm.physicalSymptom ? 'yes' : 'no'} onChange={(e) => setEsm((p) => ({ ...p, physicalSymptom: e.target.value === 'yes' }))} disabled={!canTakeAssessments}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
            <label>
              Help-Seeking Intention
              <select value={esm.helpIntent ? 'yes' : 'no'} onChange={(e) => setEsm((p) => ({ ...p, helpIntent: e.target.value === 'yes' }))} disabled={!canTakeAssessments}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
          </div>
          <button type="button" onClick={submitEsm} disabled={!canTakeAssessments || loading}>
            {loading ? 'Submitting...' : 'Submit ESM'}
          </button>
          {lastEsmResult ? (
            <div className="summary-grid two-col">
              <article className="summary-card">
                <h3>Trajectory</h3>
                <p><strong>{lastEsmResult.trajectory?.label}</strong></p>
                <ul className="mini-list">
                  <li>Mood Slope: {Number(lastEsmResult.trajectory?.moodSlope || 0).toFixed(2)}</li>
                  <li>Energy Slope: {Number(lastEsmResult.trajectory?.energySlope || 0).toFixed(2)}</li>
                  <li>Combined Slope: {Number(lastEsmResult.trajectory?.combinedSlope || 0).toFixed(2)}</li>
                </ul>
              </article>
              <article className="summary-card">
                <h3>Automation</h3>
                <p>Anonymized OGC Notification: <strong>{yesNo(lastEsmResult.generatedNotification)}</strong></p>
                <p>Triggered only if trajectory is At-Risk and existing risk level is High.</p>
              </article>
            </div>
          ) : null}
        </section>
      ) : null}

      {activePage === 'dashboard' ? (
        <section className="card">
          <h2>Personal Risk Dashboard</h2>
          <button type="button" onClick={refreshDashboard} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh Dashboard'}</button>
          {dashboard ? (
            <div className="dashboard-wrap">
              <div className="hero-metrics">
                <article className="metric-card">
                  <h3>Current Risk</h3>
                  <p><span className={riskClassName(dashboard.riskLevel)}>{dashboard.riskLevel}</span></p>
                </article>
                <article className="metric-card">
                  <h3>Next Action</h3>
                  <p>{dashboard.nextAction}</p>
                </article>
                <article className="metric-card">
                  <h3>Consent</h3>
                  <p>{yesNo(dashboard.student?.consentFlag)}</p>
                </article>
              </div>

              {dashboard.latestClassification ? (
                <article className="summary-card full-width">
                  <h3>Latest Classification</h3>
                  <p>
                    Source: <strong>{dashboard.latestClassification.meta?.source || 'Unknown'}</strong> | Generated At:{' '}
                    <strong>{new Date(dashboard.latestClassification.generatedAt).toLocaleString()}</strong>
                  </p>

                  {dashboard.latestClassification.meta?.subscaleScores ? (
                    <div className="summary-grid three-col">
                      <div className="score-chip">Depression: {dashboard.latestClassification.meta.subscaleScores.depression}</div>
                      <div className="score-chip">Anxiety: {dashboard.latestClassification.meta.subscaleScores.anxiety}</div>
                      <div className="score-chip">Stress: {dashboard.latestClassification.meta.subscaleScores.stress}</div>
                    </div>
                  ) : null}
                </article>
              ) : null}

              <article className="summary-card full-width">
                <h3>Mood + Energy Timeline</h3>
                {Array.isArray(dashboard.moodSeries) && dashboard.moodSeries.length > 0 ? (
                  <div className="mood-series">
                    {dashboard.moodSeries.slice(-12).map((entry) => (
                      <div className="mood-row" key={entry.promptTime}>
                        <span className="mood-time">{new Date(entry.promptTime).toLocaleString()}</span>
                        <div className="bar-track">
                          <div className="bar mood" style={{ width: `${entry.moodScore * 10}%` }}>Mood {entry.moodScore}</div>
                        </div>
                        <div className="bar-track">
                          <div className="bar energy" style={{ width: `${entry.energyScore * 10}%` }}>Energy {entry.energyScore}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No ESM check-ins yet. Submit ESM entries to populate this chart.</p>
                )}
              </article>
            </div>
          ) : <p>No dashboard data loaded yet.</p>}
        </section>
      ) : null}

      {error ? <p className="error global-error">{error}</p> : null}
      </main>

      <footer className="inst-footer">© {new Date().getFullYear()} Batangas State University — SPARTAN-G Student Wellbeing Portal</footer>
    </>
  );
}
