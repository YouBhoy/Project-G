import express from 'express';
import { readDb, writeDb } from '../../storage/index.js';
import { auth, requireRole } from '../../middleware/auth.js';
import { pseudonymizeStudentId, nowIso } from '../../utils/helpers.js';
import { getAuthorizedStudentIds } from '../../utils/ogcScope.js';

const router = express.Router();

// Get appointments for OGC facilitator
router.get('/', auth, requireRole('ogc'), async (req, res) => {
  const db = await readDb();
  const facilitator = db.facilitators.find((item) => Number(item.facilitatorId) === Number(req.user.facilitatorId));
  if (!facilitator) {
    return res.status(404).json({ success: false, message: 'Facilitator not found.' });
  }

  const authorizedStudentIds = getAuthorizedStudentIds(db, facilitator);
  const appointments = db.appointments
    .filter((a) => Number(a.facilitatorId) === Number(req.user.facilitatorId) && authorizedStudentIds.has(String(a.studentId)))
    .map((a) => {
      const student = db.students.find((s) => s.studentId === a.studentId);
      return {
        appointmentId: a.appointmentId,
        slotId: a.slotId,
        slotDate: a.slotDate,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        requestedAt: a.requestedAt,
        approvedAt: a.approvedAt,
        rejectedAt: a.rejectedAt,
        completedAt: a.completedAt,
        studentName: student?.consentFlag ? student.name : null,
        studentCollege: student?.college || null,
        pseudoId: pseudonymizeStudentId(a.studentId),
        canRevealIdentity: Boolean(student?.consentFlag)
      };
    })
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  const appointmentCounts = {
    Requested: appointments.filter((a) => a.status === 'Requested').length,
    Approved: appointments.filter((a) => a.status === 'Approved').length,
    Rejected: appointments.filter((a) => a.status === 'Rejected').length,
    Completed: appointments.filter((a) => a.status === 'Completed').length,
    Cancelled: appointments.filter((a) => a.status === 'Cancelled').length
  };

  return res.json({
    success: true,
    data: {
      totalAppointments: appointments.length,
      appointmentCounts,
      appointments
    }
  });
});

// Approve appointment
router.post('/:appointmentId/approve', auth, requireRole('ogc'), async (req, res) => {
  const appointmentId = Number(req.params.appointmentId);
  const { ogcNotes = '' } = req.body || {};
  const db = await readDb();
  const facilitator = db.facilitators.find((item) => Number(item.facilitatorId) === Number(req.user.facilitatorId));
  const appointment = db.appointments.find((a) => a.appointmentId === appointmentId);

  if (!facilitator) {
    return res.status(404).json({ success: false, message: 'Facilitator not found.' });
  }

  const authorizedStudentIds = getAuthorizedStudentIds(db, facilitator);

  if (!appointment || Number(appointment.facilitatorId) !== Number(req.user.facilitatorId) || !authorizedStudentIds.has(String(appointment.studentId))) {
    return res.status(404).json({ success: false, message: 'Appointment not found or you lack permission.' });
  }

  if (appointment.status !== 'Requested') {
    return res.status(400).json({ success: false, message: `Cannot approve a ${appointment.status} appointment.` });
  }

  appointment.status = 'Approved';
  appointment.approvedAt = nowIso();
  appointment.ogcNotes = ogcNotes || null;
  await writeDb(db);

  return res.json({
    success: true,
    data: {
      message: 'Appointment approved successfully.',
      appointment
    }
  });
});

// Reject appointment
router.post('/:appointmentId/reject', auth, requireRole('ogc'), async (req, res) => {
  const appointmentId = Number(req.params.appointmentId);
  const { rejectionReason = '' } = req.body || {};
  const db = await readDb();
  const facilitator = db.facilitators.find((item) => Number(item.facilitatorId) === Number(req.user.facilitatorId));
  const appointment = db.appointments.find((a) => a.appointmentId === appointmentId);

  if (!facilitator) {
    return res.status(404).json({ success: false, message: 'Facilitator not found.' });
  }

  const authorizedStudentIds = getAuthorizedStudentIds(db, facilitator);

  if (!appointment || Number(appointment.facilitatorId) !== Number(req.user.facilitatorId) || !authorizedStudentIds.has(String(appointment.studentId))) {
    return res.status(404).json({ success: false, message: 'Appointment not found or you lack permission.' });
  }

  if (appointment.status !== 'Requested') {
    return res.status(400).json({ success: false, message: `Cannot reject a ${appointment.status} appointment.` });
  }

  const slot = db.availabilitySlots.find((s) => s.slotId === appointment.slotId);
  if (slot) {
    slot.bookedCount = Math.max(0, slot.bookedCount - 1);
    if (slot.bookedCount < slot.maxSlots) {
      slot.status = 'Available';
    }
  }

  appointment.status = 'Rejected';
  appointment.rejectedAt = nowIso();
  appointment.rejectionReason = rejectionReason || null;
  await writeDb(db);

  return res.json({
    success: true,
    data: {
      message: 'Appointment rejected successfully.',
      appointment
    }
  });
});

// Complete appointment
router.post('/:appointmentId/complete', auth, requireRole('ogc'), async (req, res) => {
  const appointmentId = Number(req.params.appointmentId);
  const { ogcNotes = '' } = req.body || {};
  const db = await readDb();
  const facilitator = db.facilitators.find((item) => Number(item.facilitatorId) === Number(req.user.facilitatorId));
  const appointment = db.appointments.find((a) => a.appointmentId === appointmentId);

  if (!facilitator) {
    return res.status(404).json({ success: false, message: 'Facilitator not found.' });
  }

  const authorizedStudentIds = getAuthorizedStudentIds(db, facilitator);

  if (!appointment || Number(appointment.facilitatorId) !== Number(req.user.facilitatorId) || !authorizedStudentIds.has(String(appointment.studentId))) {
    return res.status(404).json({ success: false, message: 'Appointment not found or you lack permission.' });
  }

  if (appointment.status !== 'Approved') {
    return res.status(400).json({ success: false, message: `Can only complete Approved appointments.` });
  }

  appointment.status = 'Completed';
  appointment.completedAt = nowIso();
  appointment.ogcNotes = ogcNotes || null;
  await writeDb(db);

  return res.json({
    success: true,
    data: {
      message: 'Appointment marked as complete.',
      appointment
    }
  });
});

export default router;
