const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const CALENDAR_ID = process.env.CALENDAR_ID;
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

app.use(cors());
app.use(express.json());

function ensureConfigured() {
  if (!CALENDAR_ID) {
    const error = new Error('Missing CALENDAR_ID in server/.env.');
    error.statusCode = 500;
    throw error;
  }

  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    const error = new Error('Missing service-account.json in the server folder.');
    error.statusCode = 500;
    throw error;
  }
}

function getAuthClient() {
  ensureConfigured();

  const credentials = require(SERVICE_ACCOUNT_PATH);
  const jwtClient = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: SCOPES
  });

  return jwtClient;
}

function getCalendarClient(authClient) {
  return google.calendar({ version: 'v3', auth: authClient });
}

function parseDescription(description = '') {
  const lines = String(description).split(/\r?\n/);
  const data = {
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    maxStudents: 1,
    bookings: [],
    status: 'Open'
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('Title:')) data.title = trimmed.replace('Title:', '').trim();
    if (trimmed.startsWith('Date:')) data.date = trimmed.replace('Date:', '').trim();
    if (trimmed.startsWith('Start Time:')) data.startTime = trimmed.replace('Start Time:', '').trim();
    if (trimmed.startsWith('End Time:')) data.endTime = trimmed.replace('End Time:', '').trim();
    if (trimmed.startsWith('Max Students:')) data.maxStudents = Number(trimmed.replace('Max Students:', '').trim()) || 1;
    if (trimmed.startsWith('Booking Status:')) {
      const statusVal = trimmed.replace('Booking Status:', '').trim();
      // If there's a current booking, attach status to that booking; otherwise set event-level status
      if (data.bookings.length > 0) {
        data.bookings[data.bookings.length - 1].status = statusVal || data.bookings[data.bookings.length - 1].status || 'Pending';
      } else {
        data.status = statusVal || data.status;
      }
    }

    if (trimmed.startsWith('Student ID:')) {
      const studentId = trimmed.replace('Student ID:', '').trim();
      data.bookings.push({ studentId, studentName: '', status: 'Pending' });
    }

    if (trimmed.startsWith('Student Name:')) {
      const studentName = trimmed.replace('Student Name:', '').trim();
      if (data.bookings.length === 0) {
        data.bookings.push({ studentName, studentId: '', status: 'Pending' });
      } else {
        data.bookings[data.bookings.length - 1].studentName = studentName;
      }
    }
  }

  data.bookingCount = data.bookings.length;
  data.spotsAvailable = Math.max(data.maxStudents - data.bookingCount, 0);
  data.isFull = data.spotsAvailable === 0;
  return data;
}

function buildDescription({ title, date, startTime, endTime, maxStudents }) {
  return [
    `Title: ${title}`,
    `Date: ${date}`,
    `Start Time: ${startTime}`,
    `End Time: ${endTime}`,
    `Max Students: ${maxStudents}`,
    'Booking Status: Open'
  ].join('\n');
}

function buildBookingDescription(description, booking) {
  const suffix = [
    '',
    `Student ID: ${booking.studentId}`,
    `Student Name: ${booking.studentName}`,
    'Booking Status: Pending'
  ].join('\n');

  return `${String(description || '').trim()}${suffix}`;
}

function normalizeDateString(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEventStart(event) {
  const startValue = event.start?.dateTime || event.start?.date;
  return startValue ? new Date(startValue) : null;
}

function sendError(res, error) {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ success: false, message: error.message || 'Server error.' });
}

function updateBookingStatusInDescription(description = '', studentId, newStatus) {
  const lines = String(description || '').split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('Student ID:')) {
      const idVal = line.replace('Student ID:', '').trim();
      if (idVal === studentId) {
        // find the next 'Booking Status:' line after this student block
        let j = i + 1;
        let replaced = false;
        for (; j < lines.length; j++) {
          if (lines[j].trim().startsWith('Booking Status:')) {
            lines[j] = `Booking Status: ${newStatus}`;
            replaced = true;
            break;
          }
          // stop if next student begins
          if (lines[j].trim().startsWith('Student ID:')) break;
        }

        // if not found, append after current student name (or at end)
        if (!replaced) {
          // find position after student name
          let insertAt = i + 1;
          if (lines[insertAt] && lines[insertAt].trim().startsWith('Student Name:')) insertAt = insertAt + 1;
          lines.splice(insertAt, 0, `Booking Status: ${newStatus}`);
        }
        break; // done
      }
    }
    i++;
  }

  return lines.join('\n');
}

async function withCalendar(handler) {
  const authClient = getAuthClient();
  await authClient.authorize();
  const calendar = getCalendarClient(authClient);
  return handler(calendar);
}

app.get('/api/slots', async (req, res) => {
  try {
    const data = await withCalendar(async (calendar) => {
      const response = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: new Date().toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500
      });

      const slots = (response.data.items || [])
        .map((event) => {
          const parsed = parseDescription(event.description);
          const start = getEventStart(event);
          return {
            eventId: event.id,
            title: parsed.title || event.summary || 'Counseling Slot',
            date: parsed.date || (start ? start.toISOString().slice(0, 10) : ''),
            startTime: parsed.startTime,
            endTime: parsed.endTime,
            maxStudents: parsed.maxStudents,
            bookingCount: parsed.bookingCount,
            bookings: parsed.bookings || [],
            spotsAvailable: parsed.spotsAvailable,
            isFull: parsed.isFull,
            description: event.description || '',
            calendarStatus: parsed.status,
            rawEvent: event
          };
        })
        .filter((slot) => {
          const start = normalizeDateString(`${slot.date}T${slot.startTime || '00:00:00'}`);
          return start && start >= new Date();
        });

      return slots;
    });

    res.json({ success: true, data: data });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/slots', async (req, res) => {
  try {
    const { title, date, startTime, endTime, maxStudents } = req.body || {};
    if (!title || !date || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'title, date, startTime, and endTime are required.' });
    }

    const data = await withCalendar(async (calendar) => {
      const event = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        requestBody: {
          summary: title,
          description: buildDescription({
            title,
            date,
            startTime,
            endTime,
            maxStudents: Number(maxStudents) || 1
          }),
          start: {
            dateTime: `${date}T${startTime}:00`,
            timeZone: 'Asia/Manila'
          },
          end: {
            dateTime: `${date}T${endTime}:00`,
            timeZone: 'Asia/Manila'
          }
        }
      });

      return {
        eventId: event.data.id,
        title,
        date,
        startTime,
        endTime,
        maxStudents: Number(maxStudents) || 1
      };
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
});

app.delete('/api/slots/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    await withCalendar(async (calendar) => {
      await calendar.events.delete({
        calendarId: CALENDAR_ID,
        eventId
      });
    });

    res.json({ success: true, data: { eventId } });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/book/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { studentId, studentName } = req.body || {};
    if (!studentId || !studentName) {
      return res.status(400).json({ success: false, message: 'studentId and studentName are required.' });
    }

    const data = await withCalendar(async (calendar) => {
      const existing = await calendar.events.get({
        calendarId: CALENDAR_ID,
        eventId
      });

      const parsed = parseDescription(existing.data.description);
      if (parsed.isFull) {
        const error = new Error('Slot is full.');
        error.statusCode = 409;
        throw error;
      }

      const alreadyBooked = parsed.bookings.some((booking) => booking.studentId === studentId);
      if (alreadyBooked) {
        const error = new Error('Student already booked this slot.');
        error.statusCode = 409;
        throw error;
      }

      const updatedDescription = buildBookingDescription(existing.data.description, { studentId, studentName });
      const updated = await calendar.events.patch({
        calendarId: CALENDAR_ID,
        eventId,
        requestBody: {
          ...existing.data,
          description: updatedDescription
        }
      });

      return {
        eventId: updated.data.id,
        studentId,
        studentName,
        status: 'Pending'
      };
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/bookings/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const data = await withCalendar(async (calendar) => {
      const response = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: new Date().toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500
      });

      const bookings = (response.data.items || []).flatMap((event) => {
        const parsed = parseDescription(event.description);
        return parsed.bookings
          .filter((booking) => booking.studentId === studentId)
          .map((booking) => {
            const start = getEventStart(event);
            return {
              eventId: event.id,
              title: parsed.title || event.summary || 'Counseling Slot',
              date: parsed.date || (start ? start.toISOString().slice(0, 10) : ''),
              startTime: parsed.startTime,
              endTime: parsed.endTime,
              studentId: booking.studentId,
              studentName: booking.studentName || '',
              status: booking.status || parsed.status,
              spotsAvailable: parsed.spotsAvailable,
              maxStudents: parsed.maxStudents
            };
          });
      });

      return bookings;
    });

    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
});

app.patch('/api/bookings/:eventId/confirm', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { studentId } = req.body || {};
    const data = await withCalendar(async (calendar) => {
      const existing = await calendar.events.get({
        calendarId: CALENDAR_ID,
        eventId
      });

      let updatedDescription = String(existing.data.description || '');
      if (studentId) {
        updatedDescription = updateBookingStatusInDescription(updatedDescription, studentId, 'Confirmed');
      } else {
        updatedDescription = updatedDescription.replace(/Booking Status:\s*(Pending|Cancelled|Confirmed)/g, 'Booking Status: Confirmed');
      }

      const updated = await calendar.events.patch({
        calendarId: CALENDAR_ID,
        eventId,
        requestBody: {
          ...existing.data,
          description: updatedDescription
        }
      });

      return { eventId: updated.data.id, status: 'Confirmed' };
    });

    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
});

app.patch('/api/bookings/:eventId/cancel', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { studentId } = req.body || {};
    const data = await withCalendar(async (calendar) => {
      const existing = await calendar.events.get({
        calendarId: CALENDAR_ID,
        eventId
      });

      let updatedDescription = String(existing.data.description || '');
      if (studentId) {
        updatedDescription = updateBookingStatusInDescription(updatedDescription, studentId, 'Cancelled');
      } else {
        updatedDescription = updatedDescription.replace(/Booking Status:\s*(Pending|Cancelled|Confirmed)/g, 'Booking Status: Cancelled');
      }

      const updated = await calendar.events.patch({
        calendarId: CALENDAR_ID,
        eventId,
        requestBody: {
          ...existing.data,
          description: updatedDescription
        }
      });

      return { eventId: updated.data.id, status: 'Cancelled' };
    });

    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
});

app.patch('/api/bookings/:eventId/disapprove', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { studentId } = req.body || {};
    if (!studentId) return res.status(400).json({ success: false, message: 'studentId is required.' });

    const data = await withCalendar(async (calendar) => {
      const existing = await calendar.events.get({
        calendarId: CALENDAR_ID,
        eventId
      });

      const updatedDescription = updateBookingStatusInDescription(String(existing.data.description || ''), studentId, 'Declined');

      const updated = await calendar.events.patch({
        calendarId: CALENDAR_ID,
        eventId,
        requestBody: {
          ...existing.data,
          description: updatedDescription
        }
      });

      return { eventId: updated.data.id, status: 'Declined' };
    });

    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
});

app.use((error, req, res, next) => {
  sendError(res, error);
});

app.listen(PORT, () => {
  console.log(`Spartan calendar server listening on port ${PORT}`);
});
