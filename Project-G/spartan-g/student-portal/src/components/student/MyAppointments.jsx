import { useEffect, useMemo, useState } from 'react';
import { CALENDAR_API_BASE } from '../../config.js';

async function requestJson(path, options = {}) {
  try {
    const response = await fetch(`${CALENDAR_API_BASE}${path}`, {
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

function normalizeBookings(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.bookings)) return data.bookings;
  return [];
}

function statusClass(status) {
  if (status === 'Confirmed') return 'consented';
  if (status === 'Cancelled') return 'not-consented';
  return 'pending';
}

export default function MyAppointments({ student }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const studentId = student?.studentId || '';
  const studentLabel = useMemo(() => student?.name || student?.studentId || 'Student', [student]);

  const loadBookings = async () => {
    if (!studentId) {
      setBookings([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await requestJson(`/api/bookings/${encodeURIComponent(studentId)}`);
      setBookings(normalizeBookings(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [studentId]);

  const handleCancel = async (booking) => {
    if (!window.confirm('Cancel this appointment request?')) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');
      await requestJson(`/api/bookings/${booking.eventId}/cancel`, { method: 'PATCH' });
      setMessage('Appointment cancelled.');
      await loadBookings();
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
          <h2>My Appointments</h2>
          <p>Track your booking requests and their current status.</p>
        </div>
        <button type="button" className="muted-btn" onClick={loadBookings} disabled={loading}>
          Refresh
        </button>
      </div>

      <p className="hint">Student: {studentLabel}</p>
      {message ? <p className="calendar-success">{message}</p> : null}
      {error ? <p className="calendar-error">{error}</p> : null}

      <div className="ogc-table-wrap">
        <table className="ogc-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Title</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length ? bookings.map((booking) => (
              <tr key={`${booking.eventId}-${booking.studentId}`}>
                <td>{booking.date}</td>
                <td>{booking.startTime} - {booking.endTime}</td>
                <td>{booking.title}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: booking.status === 'Confirmed' ? '#2e7d32' : booking.status === 'Cancelled' ? '#8B0000' : '#f4c542',
                      color: booking.status === 'Pending' ? '#2b2200' : '#ffffff'
                    }}
                  >
                    {booking.status}
                  </span>
                </td>
                <td>
                  {booking.status === 'Pending' ? (
                    <button type="button" className="danger-btn" onClick={() => handleCancel(booking)} disabled={loading}>
                      Cancel
                    </button>
                  ) : (
                    <span className="hint">No action available</span>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5">You have not booked any appointments yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
