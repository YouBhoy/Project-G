import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';

function normalizeSlots(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.availableSlots)) return data.availableSlots;
  if (Array.isArray(data?.slots)) return data.slots;
  return [];
}

export default function BookAppointment({ student, token }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const studentId = student?.studentId || '';
  const studentName = useMemo(() => student?.name || student?.studentId || 'Student', [student]);

  const loadSlots = async () => {
    setLoading(true);
    setError('');
    try {
      // Prefer authenticated backend slots when logged in
      if (token) {
        const res = await api.getAvailableSlots(token);
        const normalized = normalizeSlots(res);
        // Ensure slots have required fields for display
        setSlots(normalized.map((s) => ({
          slotId: s.slotId || s.eventId,
          eventId: s.slotId || s.eventId, // Keep eventId for compatibility
          date: s.slotDate || s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          facilitatorId: s.facilitatorId,
          maxSlots: s.maxSlots,
          bookedCount: s.bookedCount,
          spotsAvailable: (s.maxSlots || 0) - (s.bookedCount || 0)
        })));
      } else {
        setError('Authentication required to book appointments.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const handleBook = async (slot) => {
    if (!studentId || !studentName) {
      setError('Student profile is required before booking.');
      return;
    }

    if (!token) {
      setError('You must be logged in to book appointments.');
      return;
    }

    if (!window.confirm(`Book ${slot.date} from ${slot.startTime} to ${slot.endTime}?`)) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');
      // Use authenticated backend API to create appointment
      await api.bookAppointment({ slotId: slot.slotId, studentNotes: '' }, token);
      setMessage('Appointment request sent!');
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
          <h2>Book Appointment</h2>
          <p>Choose an available counseling slot from the facilitator calendar.</p>
        </div>
        <button type="button" className="muted-btn" onClick={loadSlots} disabled={loading}>
          Refresh
        </button>
      </div>

      {message ? <p className="calendar-success">{message}</p> : null}
      {error ? <p className="calendar-error">{error}</p> : null}

      <div className="ogc-table-wrap">
        <div className="slot-card-grid">
          {slots.length ? slots.map((slot) => (
            <article key={slot.eventId} className="slot-card">
              <h3>{slot.title || 'Counseling Slot'}</h3>
              <p><strong>Date:</strong> {slot.date}</p>
              <p><strong>Time:</strong> {slot.startTime} - {slot.endTime}</p>
              <p><strong>Available Spots:</strong> {slot.spotsAvailable || 0}</p>
              <p><strong>Spots Available:</strong> {slot.spotsAvailable}</p>
              {slot.isFull ? (
                <span className="status-badge full">Full</span>
              ) : (
                <button type="button" className="danger-btn" onClick={() => handleBook(slot)} disabled={loading}>
                  Book
                </button>
              )}
            </article>
          )) : <p className="hint">No available slots right now.</p>}
        </div>
      </div>
    </section>
  );
}
