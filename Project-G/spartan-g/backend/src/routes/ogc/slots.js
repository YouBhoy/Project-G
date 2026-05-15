import express from 'express';
import { readDb, writeDb } from '../../storage/index.js';
import { auth, requireRole } from '../../middleware/auth.js';
import { nowIso } from '../../utils/helpers.js';

const router = express.Router();

// Get facilitator's slots
router.get('/', auth, requireRole('ogc'), async (req, res) => {
  const db = await readDb();
  const slots = db.availabilitySlots.filter((s) => Number(s.facilitatorId) === Number(req.user.facilitatorId));

  return res.json({
    success: true,
    data: {
      totalSlots: slots.length,
      slots
    }
  });
});

// Create availability slot
router.post('/', auth, requireRole('ogc'), async (req, res) => {
  const { slotDate, startTime, endTime, maxSlots = 1 } = req.body || {};
  if (!slotDate || !startTime || !endTime) {
    return res.status(400).json({ success: false, message: 'slotDate, startTime, endTime are required.' });
  }

  const db = await readDb();
  const slot = {
    slotId: db.counters.slotId++,
    facilitatorId: req.user.facilitatorId,
    slotDate,
    startTime,
    endTime,
    maxSlots: Number(maxSlots),
    bookedCount: 0,
    status: 'Available',
    createdAt: nowIso()
  };

  db.availabilitySlots.push(slot);
  await writeDb(db);

  return res.status(201).json({
    success: true,
    data: {
      message: 'Availability slot created successfully.',
      slot
    }
  });
});

// Delete slot
router.delete('/:slotId', auth, requireRole('ogc'), async (req, res) => {
  const slotId = Number(req.params.slotId);
  const db = await readDb();
  const slotIndex = db.availabilitySlots.findIndex(
    (s) => s.slotId === slotId && Number(s.facilitatorId) === Number(req.user.facilitatorId)
  );

  if (slotIndex === -1) {
    return res.status(404).json({ success: false, message: 'Slot not found or you lack permission.' });
  }

  const hasBookings = db.appointments.some((a) => a.slotId === slotId && a.status !== 'Cancelled');
  if (hasBookings) {
    return res.status(400).json({ success: false, message: 'Cannot delete slot with active bookings.' });
  }

  db.availabilitySlots.splice(slotIndex, 1);
  await writeDb(db);

  return res.json({
    success: true,
    data: { message: 'Availability slot deleted successfully.' }
  });
});

export default router;
