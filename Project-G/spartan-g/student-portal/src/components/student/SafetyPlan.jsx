import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'spartan_safety_plan_v1';

const defaultPlan = {
  name: '',
  warningSigns: 'Feeling unusually sad, withdrawing from others, trouble sleeping, increased alcohol/drug use, hopeless thoughts.',
  copingStrategies: 'Take a walk, deep-breathing, use grounding 5-4-3-2-1 technique, listen to calming music, contact a supportive friend.',
  peopleToContact: 'Friend: Maria (0917-xxx-xxxx)\nParent: John (0917-xxx-xxxx)',
  professionalContacts: 'OGC: ogc.lipa@g.batstate-u.edu.ph\nCampus Health: (043) 740-0085\nNational Hotline: 0917-899-8727',
  safeEnvironment: 'Store medications securely, remove or lock potentially dangerous items, keep phone charged, plan travel with trusted person.',
  emergencySteps: 'If you feel you are at immediate risk of harming yourself, call the national hotline or local emergency services. Go to the nearest hospital emergency room.',
  notes: ''
};

export default function SafetyPlan() {
  const [plan, setPlan] = useState(defaultPlan);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setPlan((p) => ({ ...p, ...parsed.plan }));
        setSavedAt(parsed.savedAt || null);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  function updateField(key, value) {
    setPlan((p) => ({ ...p, [key]: value }));
  }

  function savePlan() {
    const payload = { plan, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setSavedAt(payload.savedAt);
    alert('Safety plan saved locally.');
  }

  function useTemplate() {
    setPlan((p) => ({ ...p, ...defaultPlan }));
  }

  function clearPlan() {
    if (!confirm('Clear your saved safety plan? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    setPlan(defaultPlan);
    setSavedAt(null);
  }

  function downloadJson() {
    const data = { plan, savedAt };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'safety-plan.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPlan() {
    const w = window.open('', '_blank');
    const html = `
      <html><head><title>Safety Plan</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}h1{color:#8B0000}pre{white-space:pre-wrap}</style>
      </head><body>
      <h1>Safety Plan</h1>
      <h3>Name</h3><div>${escapeHtml(plan.name)}</div>
      <h3>Warning Signs</h3><pre>${escapeHtml(plan.warningSigns)}</pre>
      <h3>Coping Strategies</h3><pre>${escapeHtml(plan.copingStrategies)}</pre>
      <h3>People to Contact</h3><pre>${escapeHtml(plan.peopleToContact)}</pre>
      <h3>Professional Contacts</h3><pre>${escapeHtml(plan.professionalContacts)}</pre>
      <h3>Safe Environment</h3><pre>${escapeHtml(plan.safeEnvironment)}</pre>
      <h3>Emergency Steps</h3><pre>${escapeHtml(plan.emergencySteps)}</pre>
      <h3>Notes</h3><pre>${escapeHtml(plan.notes)}</pre>
      <p>Saved: ${savedAt || 'Not saved'}</p>
      </body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  function escapeHtml(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
  }

  return (
    <section className="card safety-plan-card">
      <h2>Digital Safety Plan</h2>
      <p>Create and manage your personalised crisis plan. This is stored locally on your device only.</p>

      <div className="safety-plan-form">
        <label>Name or brief title</label>
        <input type="text" value={plan.name} onChange={(e) => updateField('name', e.target.value)} />

        <label>Warning signs (what you notice before crisis)</label>
        <textarea value={plan.warningSigns} onChange={(e) => updateField('warningSigns', e.target.value)} rows={3} />

        <label>Coping strategies (what you can do on your own)</label>
        <textarea value={plan.copingStrategies} onChange={(e) => updateField('copingStrategies', e.target.value)} rows={4} />

        <label>People to contact for support (friends/family)</label>
        <textarea value={plan.peopleToContact} onChange={(e) => updateField('peopleToContact', e.target.value)} rows={3} />

        <label>Professional & emergency contacts</label>
        <textarea value={plan.professionalContacts} onChange={(e) => updateField('professionalContacts', e.target.value)} rows={3} />

        <label>Safety steps to make environment safer</label>
        <textarea value={plan.safeEnvironment} onChange={(e) => updateField('safeEnvironment', e.target.value)} rows={3} />

        <label>What to do in an emergency (immediate steps)</label>
        <textarea value={plan.emergencySteps} onChange={(e) => updateField('emergencySteps', e.target.value)} rows={3} />

        <label>Additional notes</label>
        <textarea value={plan.notes} onChange={(e) => updateField('notes', e.target.value)} rows={3} />

        <div className="safety-actions">
          <button type="button" onClick={savePlan} className="success-btn">Save plan</button>
          <button type="button" onClick={useTemplate}>Use template</button>
          <button type="button" onClick={downloadJson}>Download JSON</button>
          <button type="button" onClick={printPlan}>Print</button>
          <button type="button" onClick={clearPlan} className="muted-btn">Clear</button>
        </div>

        <div className="hint">{savedAt ? `Last saved: ${new Date(savedAt).toLocaleString()}` : 'Not yet saved.'}</div>
      </div>
    </section>
  );
}
