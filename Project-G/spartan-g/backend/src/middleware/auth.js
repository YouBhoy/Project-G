import jwt from 'jsonwebtoken';
import { readDb } from '../storage/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'spartan-g-dev-secret';

export function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing auth token.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid auth token.' });
  }
}

export function requireRole(expectedRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== expectedRole) {
      return res.status(403).json({ success: false, message: 'Forbidden for this role.' });
    }
    return next();
  };
}

export async function ensureConsent(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Student access only.' });
  }
  const db = await readDb();
  const student = db.students.find((s) => s.studentId === req.user.studentId);
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found.' });
  }
  if (!student.consentFlag) {
    return res.status(403).json({ success: false, message: 'Consent required before assessments.' });
  }
  next();
}
