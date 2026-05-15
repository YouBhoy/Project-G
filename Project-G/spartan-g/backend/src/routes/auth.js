import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readDb, writeDb } from '../storage/index.js';
import { nowIso } from '../utils/helpers.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'spartan-g-dev-secret';

// Universal signup (handles both student and OGC)
router.post('/signup', async (req, res) => {
  const {
    role = 'student',
    studentId,
    name,
    email,
    password,
    college,
    yearLevel,
    sex,
    assignedCollege
  } = req.body || {};

  const normalizedRole = `${role}`.toLowerCase();
  const db = await readDb();

  if (normalizedRole === 'student') {
    if (!studentId || !name || !password || !college || !yearLevel || !sex) {
      return res.status(400).json({ success: false, message: 'Missing required student signup fields.' });
    }

    const exists = db.students.find((s) => s.studentId === studentId || (email && s.email === email));
    if (exists) {
      return res.status(409).json({ success: false, message: 'Student already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    db.students.push({
      studentId,
      name,
      email: email || null,
      passwordHash,
      college,
      yearLevel: Number(yearLevel),
      sex,
      consentFlag: false,
      registeredAt: nowIso()
    });

    await writeDb(db);
    
    // Generate token for immediate access to consent form
    const token = jwt.sign({ studentId, role: 'student' }, JWT_SECRET, { expiresIn: '12h' });
    return res.status(201).json({ 
      success: true, 
      message: 'Student signup successful.',
      data: {
        token,
        role: 'student',
        student: {
          studentId,
          name,
          college,
          yearLevel: Number(yearLevel),
          sex,
          consentFlag: false
        }
      }
    });
  }

  if (normalizedRole === 'ogc') {
    if (!name || !email || !password || !assignedCollege) {
      return res.status(400).json({ success: false, message: 'Missing required OGC signup fields.' });
    }

    const facilitatorExists = db.facilitators.find((f) => `${f.email}`.toLowerCase() === `${email}`.toLowerCase());
    if (facilitatorExists) {
      return res.status(409).json({ success: false, message: 'OGC account already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nextFacilitatorId = db.facilitators.reduce((maxId, f) => Math.max(maxId, Number(f.facilitatorId) || 0), 0) + 1;
    db.facilitators.push({
      facilitatorId: nextFacilitatorId,
      name,
      assignedCollege,
      email,
      passwordHash
    });

    await writeDb(db);
    
    // Generate token for immediate access
    const token = jwt.sign({ facilitatorId: nextFacilitatorId, email, role: 'ogc' }, JWT_SECRET, { expiresIn: '12h' });
    return res.status(201).json({ 
      success: true, 
      message: 'OGC signup successful.',
      data: {
        token,
        role: 'ogc',
        facilitator: {
          facilitatorId: nextFacilitatorId,
          name,
          email,
          assignedCollege
        }
      }
    });
  }

  return res.status(400).json({ success: false, message: 'Unsupported role value.' });
});

// Universal login (handles both student and OGC)
router.post('/login', async (req, res) => {
  const { role = 'student', studentId, email, password } = req.body || {};
  const normalizedRole = `${role}`.toLowerCase();
  const db = await readDb();

  if (normalizedRole === 'student') {
    if (!studentId || !password) {
      return res.status(400).json({ success: false, message: 'studentId and password are required for student login.' });
    }

    const student = db.students.find((s) => s.studentId === studentId);
    if (!student) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const ok = await bcrypt.compare(password, student.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ studentId: student.studentId, role: 'student' }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({
      success: true,
      data: {
        token,
        role: 'student',
        student: {
          studentId: student.studentId,
          name: student.name,
          college: student.college,
          yearLevel: student.yearLevel,
          sex: student.sex,
          consentFlag: student.consentFlag
        }
      }
    });
  }

  if (normalizedRole === 'ogc') {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required for OGC login.' });
    }

    const facilitator = db.facilitators.find((f) => `${f.email}`.toLowerCase() === `${email}`.toLowerCase());
    if (!facilitator || !facilitator.passwordHash) {
      return res.status(401).json({ success: false, message: 'Invalid OGC credentials.' });
    }

    const ok = await bcrypt.compare(password, facilitator.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid OGC credentials.' });
    }

    const token = jwt.sign({ facilitatorId: facilitator.facilitatorId, role: 'ogc' }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({
      success: true,
      data: {
        token,
        role: 'ogc',
        facilitator: {
          facilitatorId: facilitator.facilitatorId,
          name: facilitator.name,
          assignedCollege: facilitator.assignedCollege,
          email: facilitator.email
        }
      }
    });
  }

  return res.status(400).json({ success: false, message: 'Unsupported role value.' });
});

export default router;
