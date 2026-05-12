import express from 'express';
import { readDb, writeDb } from '../../storage/index.js';
import { auth, requireRole } from '../../middleware/auth.js';
import { nowIso } from '../../utils/helpers.js';

const router = express.Router();

// Get student profile
router.get('/me', auth, requireRole('student'), async (req, res) => {
  const db = await readDb();
  const student = db.students.find((s) => s.studentId === req.user.studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  return res.json({
    success: true,
    data: {
      studentId: student.studentId,
      name: student.name,
      college: student.college,
      yearLevel: student.yearLevel,
      sex: student.sex,
      consentFlag: student.consentFlag
    }
  });
});

// Update consent flag
router.post('/consent', auth, requireRole('student'), async (req, res) => {
  const { consent } = req.body || {};
  if (typeof consent !== 'boolean') {
    return res.status(400).json({ success: false, message: 'consent must be boolean.' });
  }
  const db = await readDb();
  const student = db.students.find((s) => s.studentId === req.user.studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  student.consentFlag = consent;
  await writeDb(db);

  return res.json({
    success: true,
    data: {
      consentFlag: student.consentFlag,
      message: consent ? 'Consent acknowledged.' : 'Consent withdrawn. Assessments blocked until re-consent.'
    }
  });
});

export default router;
