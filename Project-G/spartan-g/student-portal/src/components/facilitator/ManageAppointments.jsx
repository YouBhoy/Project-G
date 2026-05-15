import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';

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

export default function ManageAppointments({ facilitator, token }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const facilitatorName = useMemo(() => facilitator?.name || facilitator?.email || 'Facilitator', [facilitator]);

  const loadBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getOgcAppointments(token);
      setBookings(data.appointments || []);
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
    const labelByAction = {
      approve: 'Approve',
      disapprove: 'Disapprove',
      cancel: 'Cancel'
    };

    const label = labelByAction[action];

    if (!label) return;

    if (!window.confirm(`${label} this appointment for ${booking.pseudoId || 'the student'}?`)) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');

      if (action === 'approve') {
        await api.approveAppointment(booking.appointmentId, {}, token);
      } else if (action === 'disapprove' || action === 'cancel') {
        await api.rejectAppointment(booking.appointmentId, {}, token);
      }

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
              <th>Student</th>
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
                  <tr key={`${booking.appointmentId}-${booking.pseudoId || 'student'}`}>
                    <td>{booking.pseudoId || booking.studentId || 'Student'}</td>
                    <td>{booking.slotDate || booking.date || '-'}</td>
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
