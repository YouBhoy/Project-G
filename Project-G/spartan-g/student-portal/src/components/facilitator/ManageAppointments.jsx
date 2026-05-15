import { useEffect, useMemo, useState } from 'react';
import { CALENDAR_API_BASE_URL } from '../../config.js';

async function requestJson(path, options = {}) {
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
}

function normalizeSlots(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.slots)) return data.slots;
  return [];
}

function parseBookingsFromSlots(slots) {
  const bookings = [];

  slots.forEach((slot) => {
    if (Array.isArray(slot.bookings) && slot.bookings.length) {
      slot.bookings.forEach((booking) => {
        bookings.push({
          eventId: slot.eventId,
          title: slot.title || 'Counseling Session',
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          studentId: booking.studentId || '',
          studentName: booking.studentName || '',
          status: booking.status || slot.calendarStatus || 'Pending'
        });
      });
      return;
    }

    const description = String(slot.description || '');
    const lines = description.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const base = {
      eventId: slot.eventId,
      title: slot.title || 'Counseling Session',
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      studentId: '',
      studentName: '',
      status: slot.calendarStatus || 'Pending'
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

function normalizeDisplayStatus(status) {
  if (status === 'Confirmed') return 'Approved';
  if (status === 'Declined') return 'Disapproved';
  if (status === 'Cancelled') return 'Cancelled';
  if (status === 'Approved') return 'Approved';
  if (status === 'Disapproved') return 'Disapproved';
  return 'Pending';
}

function statusStyle(status) {
  const displayStatus = normalizeDisplayStatus(status);

  if (displayStatus === 'Approved') {
    return { backgroundColor: '#2e7d32', color: '#FFFFFF' };
  }

  if (displayStatus === 'Disapproved' || displayStatus === 'Cancelled') {
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
      setBookings(parseBookingsFromSlots(normalizeSlots(data)));
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
    const endpointByAction = {
      approve: 'confirm',
      disapprove: 'disapprove',
      cancel: 'cancel'
    };

    const labelByAction = {
      approve: 'Approve',
      disapprove: 'Disapprove',
      cancel: 'Cancel'
    };

    const endpoint = endpointByAction[action];
    const label = labelByAction[action];

    if (!endpoint || !label) return;

    if (!window.confirm(`${label} this appointment for ${booking.studentName || booking.studentId || 'the student'}?`)) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');

      await requestJson(`/api/bookings/${booking.eventId}/${endpoint}`, {
        method: 'PATCH',
        body: JSON.stringify({ studentId: booking.studentId })
      });

      setMessage(`Appointment ${label.toLowerCase()}d.`);
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
          <h2>Manage Appointments</h2>
          <p>Review and respond to student appointment requests.</p>
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
              <th>Student Name</th>
              <th>Date</th>
              <th>Time</th>
              <th>Title / Type</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">Loading appointments...</td>
              </tr>
            ) : bookings.length ? (
              bookings.map((booking) => {
                const displayStatus = normalizeDisplayStatus(booking.status);

                return (
                  <tr key={`${booking.eventId}-${booking.studentId || booking.studentName || 'student'}`}>
                    <td>{booking.studentName || booking.studentId || 'Student'}</td>
                    <td>{booking.date || '-'}</td>
                    <td>{booking.startTime || '-'} - {booking.endTime || '-'}</td>
                    <td>{booking.title || 'Counseling Session'}</td>
                    <td>
                      <span className="status-badge" style={statusStyle(booking.status)}>
                        {displayStatus}
                      </span>
                    </td>
                    <td className="calendar-row-actions">
                      <button
                        type="button"
                        className="success-btn"
                        onClick={() => updateBooking(booking, 'approve')}
                        disabled={loading || displayStatus === 'Approved'}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="neutral-btn"
                        onClick={() => updateBooking(booking, 'disapprove')}
                        disabled={loading || displayStatus === 'Disapproved' || displayStatus === 'Cancelled'}
                      >
                        Disapprove
                      </button>
                      <button
                        type="button"
                        className="danger-btn"
                        onClick={() => updateBooking(booking, 'cancel')}
                        disabled={loading || displayStatus === 'Cancelled'}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6">No appointment requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
