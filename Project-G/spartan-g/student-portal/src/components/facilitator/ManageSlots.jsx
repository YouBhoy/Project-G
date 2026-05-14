import { useEffect, useMemo, useState } from 'react';

const API_BASE = 'http://localhost:3002';

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Request failed.');
  }

  return payload.data;
}

function normalizeSlots(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.slots)) return data.slots;
  return [];
}

function createEmptyForm() {
  return {
    date: '',
    startTime: '',
    endTime: '',
    maxStudents: 1
  };
}

export default function ManageSlots({ facilitator }) {
  const [form, setForm] = useState(createEmptyForm());
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const facilitatorTitle = useMemo(() => facilitator?.name || facilitator?.email || 'Facilitator', [facilitator]);

  const loadSlots = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Loading slots from http://localhost:3002/api/slots');
      const data = await requestJson('/api/slots');
      console.log('GET /api/slots response:', data);
      setSlots(normalizeSlots(data));
    } catch (err) {
      console.error('GET /api/slots failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const submitSlot = async (event) => {
    event.preventDefault();
    console.log('Submitting new slot with form state:', form);

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const requestBody = {
        title: 'Counseling Session',
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        maxStudents: Number(form.maxStudents) || 1
      };

      console.log('POST /api/slots payload:', requestBody);

      const createdSlot = await requestJson('/api/slots', {
        method: 'POST',
        body: JSON.stringify({
          title: requestBody.title,
          date: requestBody.date,
          startTime: requestBody.startTime,
          endTime: requestBody.endTime,
          maxStudents: requestBody.maxStudents
        })
      });

      console.log('POST /api/slots response:', createdSlot);
      setMessage('Slot created.');
      setForm(createEmptyForm());
      await loadSlots();
    } catch (err) {
      console.error('POST /api/slots failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId, title) => {
    if (!window.confirm(`Delete the slot ${title}?`)) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');
      console.log(`DELETE /api/slots/${eventId}`);
      await requestJson(`/api/slots/${eventId}`, { method: 'DELETE' });
      setMessage('Slot deleted.');
      await loadSlots();
    } catch (err) {
      console.error('DELETE /api/slots failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card calendar-card">
      <div className="calendar-header">
        <div>
          <h2>Manage Slots</h2>
          <p>Create counseling availability for {facilitatorTitle}.</p>
        </div>
        <button type="button" className="muted-btn" onClick={loadSlots} disabled={loading}>
          Refresh
        </button>
      </div>

      {message ? <p className="calendar-success">{message}</p> : null}
      {error ? <p className="calendar-error">{error}</p> : null}

      <form className="calendar-form" onSubmit={submitSlot}>
        <div className="form-group">
          <label htmlFor="slot-date">Date</label>
          <input id="slot-date" type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} required />
        </div>
        <div className="form-group">
          <label htmlFor="slot-start">Start Time</label>
          <input id="slot-start" type="time" value={form.startTime} onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))} required />
        </div>
        <div className="form-group">
          <label htmlFor="slot-end">End Time</label>
          <input id="slot-end" type="time" value={form.endTime} onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))} required />
        </div>
        <div className="form-group">
          <label htmlFor="slot-max">Max Students</label>
          <input id="slot-max" type="number" min="1" value={form.maxStudents} onChange={(event) => setForm((prev) => ({ ...prev, maxStudents: event.target.value }))} required />
        </div>
        <div className="calendar-form-actions">
          <button type="submit" className="calendar-primary-btn" disabled={loading}>
            Create Slot
          </button>
        </div>
        {error ? <p className="calendar-error">{error}</p> : null}
      </form>

      <div className="calendar-list-header">
        <h3>Existing Slots</h3>
      </div>

      <div className="ogc-table-wrap">
        <table className="ogc-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Time</th>
              <th>Max Students</th>
              <th>Booked</th>
              <th>Available</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {slots.length ? slots.map((slot) => (
              <tr key={slot.eventId}>
                <td>{slot.title}</td>
                <td>{slot.date}</td>
                <td>{slot.startTime} - {slot.endTime}</td>
                <td>{slot.maxStudents}</td>
                <td>{slot.bookingCount}</td>
                <td>{slot.spotsAvailable}</td>
                <td>
                  <button type="button" className="danger-btn" onClick={() => handleDelete(slot.eventId, slot.title)} disabled={loading}>
                    Delete
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7">No slots have been created yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
