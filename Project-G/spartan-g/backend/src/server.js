import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import studentProfileRoutes from './routes/student/profile.js';
import studentGawaRoutes from './routes/student/gawa.js';
import studentGabayRoutes from './routes/student/gabay.js';
import ogcDashboardRoutes from './routes/ogc/dashboard.js';
import ogcProfileRoutes from './routes/ogc/profile.js';
import ogcSlotsRoutes from './routes/ogc/slots.js';
import ogcAppointmentsRoutes from './routes/ogc/appointments.js';
import ogcAnalyticsRoutes from './routes/ogc/analytics.js';
import emergencyContactsRoutes from './routes/emergency-contacts.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 3001);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Student routes
app.use('/api/student/profile', studentProfileRoutes);
app.use('/api/student/gawa', studentGawaRoutes);
app.use('/api/student/appointments', studentGabayRoutes);

// OGC routes
app.use('/api/ogc/dashboard', ogcDashboardRoutes);
app.use('/api/ogc', ogcProfileRoutes);
app.use('/api/ogc/availability', ogcSlotsRoutes);
app.use('/api/ogc/appointments', ogcAppointmentsRoutes);
app.use('/api/ogc/analytics', ogcAnalyticsRoutes);

// Emergency contacts (public + admin)
app.use('/api/emergency-contacts', emergencyContactsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`SPARTAN-G backend running on port ${PORT}`);
});
