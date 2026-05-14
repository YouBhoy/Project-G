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

function parseBookingsFromSlots(slots) {
  // Prefer server-parsed bookings if available (includes per-booking status)
  const bookings = [];

  slots.forEach((slot) => {
    if (Array.isArray(slot.bookings) && slot.bookings.length) {
      slot.bookings.forEach((b) => {
        bookings.push({
          eventId: slot.eventId,
          title: slot.title,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          studentId: b.studentId || '',
          studentName: b.studentName || '',
          status: b.status || slot.calendarStatus || 'Pending'
        });
      });
      return;
    }

    // Fallback: try to parse description if server didn't include bookings
    const description = String(slot.description || '');
    const lines = description.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    const base = {
      eventId: slot.eventId,
      title: slot.title,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: 'Pending'
    };

    let current = null;
    lines.forEach((line) => {
      if (line.startsWith('Student ID:')) {
        current = {
          ...base,
          studentId: line.replace('Student ID:', '').trim()
        };
        bookings.push(current);
        return;
      }

      if (current && line.startsWith('Student Name:')) {
        current.studentName = line.replace('Student Name:', '').trim();
      }

      if (line.startsWith('Booking Status:')) {
        const status = line.replace('Booking Status:', '').trim();
        if (current) {
          current.status = status || current.status;
        }
      }
    });
  });

  return bookings;
}

function statusStyle(status) {
  if (status === 'Confirmed') {
    return { backgroundColor: '#2e7d32', color: '#FFFFFF' };
  }

  if (status === 'Cancelled') {
    return { backgroundColor: '#8B0000', color: '#FFFFFF' };
  }

  return { backgroundColor: '#f4c542', color: '#2b2200' };
}

export default function ManageAppointments({ facilitator }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const facilitatorName = useMemo(() => facilitator?.name || facilitator?.email || 'Facilitator', [facilitator]);

  const loadBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await requestJson('/api/slots');
      const slots = normalizeSlots(data);
      setBookings(parseBookingsFromSlots(slots));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const updateBooking = async (booking, action) => {
    if (!window.confirm(`${action} this appointment for ${booking.studentId || booking.studentName}?`)) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const path = `/api/bookings/${booking.eventId}/${action.toLowerCase()}`;
      await requestJson(path, {
        method: 'PATCH',
        body: JSON.stringify({ studentId: booking.studentId })
      });

      setMessage(`Appointment ${action.toLowerCase()}ed.`);
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
          <h2>Appointments</h2>
          <p>Review student booking requests from the facilitator calendar.</p>
        </div>
        <button type="button" className="muted-btn" onClick={loadBookings} disabled={loading}>
          Refresh
        </button>
      </div>

      <p className="hint">Facilitator: {facilitatorName}</p>
      {message ? <p className="calendar-success">{message}</p> : null}
      {error ? <p className="calendar-error">{error}</p> : null}

      <div className="ogc-table-wrap">
        <table className="ogc-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length ? bookings.map((booking) => (
              <tr key={`${booking.eventId}-${booking.studentId}`}> 
                <td>{booking.studentId}</td>
                <td>{booking.date}</td>
                <td>{booking.startTime} - {booking.endTime}</td>
                <td>
                  <span className="status-badge" style={statusStyle(booking.status)}>
                    {booking.status}
                  </span>
                </td>
                <td className="calendar-row-actions">
                  <button type="button" className="success-btn" onClick={() => updateBooking(booking, 'Confirm')} disabled={loading || booking.status === 'Confirmed'}>
                    Confirm
                  </button>
                  <button type="button" className="neutral-btn" onClick={() => updateBooking(booking, 'Disapprove')} disabled={loading || booking.status === 'Declined' || booking.status === 'Cancelled'}>
                    Disapprove
                  </button>
                  <button type="button" className="danger-btn" onClick={() => updateBooking(booking, 'Cancel')} disabled={loading || booking.status === 'Cancelled'}>
                    Cancel
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5">No appointment requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
