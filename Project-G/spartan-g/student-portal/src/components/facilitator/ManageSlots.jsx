import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';

function createEmptyForm() {
  return {
    date: '',
    startTime: '',
    endTime: '',
    maxStudents: 1
  };
}

export default function ManageSlots({ facilitator, token }) {
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
      const data = await api.getOgcAvailabilitySlots(token);
      setSlots(data.slots || []);
    } catch (err) {
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
    try {
      setLoading(true);
      setError('');
      setMessage('');

      const requestBody = {
        slotDate: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        maxSlots: Number(form.maxStudents) || 1
      };

      await api.createAvailabilitySlot(requestBody, token);
      setMessage('Slot created.');
      setForm(createEmptyForm());
      await loadSlots();
    } catch (err) {
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
      await api.deleteAvailabilitySlot(eventId, token);
      setMessage('Slot deleted.');
      await loadSlots();
    } catch (err) {
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
                <td>{slot.title || 'Counseling Session'}</td>
                <td>{slot.slotDate || slot.date}</td>
                <td>{slot.startTime} - {slot.endTime}</td>
                <td>{slot.maxSlots || slot.maxStudents}</td>
                <td>{slot.bookedCount || slot.bookingCount || 0}</td>
                <td>{slot.spotsAvailable ?? Math.max((slot.maxSlots || slot.maxStudents || 0) - (slot.bookedCount || slot.bookingCount || 0), 0)}</td>
                <td>
                  <button type="button" className="danger-btn" onClick={() => handleDelete(slot.slotId || slot.eventId, slot.title)} disabled={loading}>
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
