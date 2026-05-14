import express from 'express';
import { readDb, writeDb } from '../../storage/index.js';
import { auth, requireRole } from '../../middleware/auth.js';
import { nowIso, todayDate } from '../../utils/helpers.js';

const router = express.Router();

// Get available slots for student
router.get('/available', auth, requireRole('student'), async (req, res) => {
  const db = await readDb();
  const today = todayDate();

  const availableSlots = db.availabilitySlots
    .filter((s) => s.slotDate >= today && s.status === 'Available' && s.bookedCount < s.maxSlots)
    .map((s) => ({
      slotId: s.slotId,
      facilitatorId: s.facilitatorId,
      slotDate: s.slotDate,
      startTime: s.startTime,
      endTime: s.endTime,
      facilitatorName: db.facilitators.find((f) => f.facilitatorId === s.facilitatorId)?.name || 'Unknown'
    }))
    .sort((a, b) => a.slotDate.localeCompare(b.slotDate) || a.startTime.localeCompare(b.startTime));

  return res.json({
    success: true,
    data: {
      availableSlots
    }
  });
});

// Book appointment
router.post('/book', auth, requireRole('student'), async (req, res) => {
  const { slotId, studentNotes = '' } = req.body || {};
  if (!slotId) {
    return res.status(400).json({ success: false, message: 'slotId is required.' });
  }

  const db = await readDb();
  const slot = db.availabilitySlots.find((s) => s.slotId === slotId);
  if (!slot) {
    return res.status(404).json({ success: false, message: 'Slot not found.' });
  }

  if (slot.bookedCount >= slot.maxSlots) {
    return res.status(400).json({ success: false, message: 'Slot is full.' });
  }

  const hasConflict = db.appointments.some(
    (a) => a.studentId === req.user.studentId && a.appointmentDate === slot.slotDate && a.status !== 'Cancelled'
  );
  if (hasConflict) {
    return res.status(400).json({ success: false, message: 'You already have an appointment on this date.' });
  }

  const appointment = {
    appointmentId: db.counters.appointmentId++,
    studentId: req.user.studentId,
    facilitatorId: slot.facilitatorId,
    slotId,
    slotDate: slot.slotDate,
    startTime: slot.startTime,
    endTime: slot.endTime,
    status: 'Requested',
    studentNotes: studentNotes || null,
    ogcNotes: null,
    rejectionReason: null,
    requestedAt: nowIso(),
    approvedAt: null,
    rejectedAt: null,
    completedAt: null
  };

  slot.bookedCount += 1;
  if (slot.bookedCount >= slot.maxSlots) {
    slot.status = 'Full';
  }

  db.appointments.push(appointment);
  await writeDb(db);

  return res.status(201).json({
    success: true,
    data: {
      message: 'Appointment booking requested successfully.',
      appointment
    }
  });
});

// Get student's appointments
router.get('/', auth, requireRole('student'), async (req, res) => {
  const db = await readDb();
  const appointments = db.appointments
    .filter((a) => a.studentId === req.user.studentId)
    .map((a) => {
      const facilitator = db.facilitators.find((f) => f.facilitatorId === a.facilitatorId);
      return {
        appointmentId: a.appointmentId,
        slotId: a.slotId,
        slotDate: a.slotDate,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        requestedAt: a.requestedAt,
        facilitatorName: facilitator?.name || 'Unknown',
        facilitatorEmail: facilitator?.email || null
      };
    });

  return res.json({
    success: true,
    data: {
      appointments
    }
  });
});

// Cancel appointment
router.delete('/:appointmentId', auth, requireRole('student'), async (req, res) => {
  const appointmentId = Number(req.params.appointmentId);
  const db = await readDb();
  const appointment = db.appointments.find((a) => a.appointmentId === appointmentId);

  if (!appointment || appointment.studentId !== req.user.studentId) {
    return res.status(404).json({ success: false, message: 'Appointment not found or you lack permission.' });
  }

  if (appointment.status === 'Cancelled' || appointment.status === 'Completed') {
    return res.status(400).json({ success: false, message: `Cannot cancel a ${appointment.status} appointment.` });
  }

  const slot = db.availabilitySlots.find((s) => s.slotId === appointment.slotId);
  if (slot) {
    slot.bookedCount = Math.max(0, slot.bookedCount - 1);
    if (slot.bookedCount < slot.maxSlots) {
      slot.status = 'Available';
    }
  }

  appointment.status = 'Cancelled';
  await writeDb(db);

  return res.json({
    success: true,
    data: { message: 'Appointment cancelled successfully.' }
  });
});

export default router;
