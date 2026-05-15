import { useEffect, useMemo, useState } from 'react';
import { CALENDAR_API_BASE_URL } from '../../config.js';

async function requestJson(path, options = {}) {
  try {
    const response = await fetch(`${CALENDAR_API_BASE_URL}${path}`, {
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
  } catch (error) {
    if (error instanceof TypeError || String(error?.message || '').includes('fetch')) {
      throw new Error('Cannot connect to the calendar server. Please make sure the server is running.');
    }
    throw error;
  }
}

function normalizeSlots(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.slots)) return data.slots;
  return [];
}

export default function BookAppointment({ student }) {
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
      const data = await requestJson('/api/slots');
      setSlots(normalizeSlots(data));
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

    if (!window.confirm(`Book ${slot.date} from ${slot.startTime} to ${slot.endTime}?`)) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');
      await requestJson(`/api/book/${slot.eventId}`, {
        method: 'POST',
        body: JSON.stringify({ studentId, studentName })
      });
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
              <p><strong>Facilitator:</strong> {slot.title || 'Counseling Slot'}</p>
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
