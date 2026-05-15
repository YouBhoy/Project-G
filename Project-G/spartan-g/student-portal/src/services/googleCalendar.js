const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const SLOT_EVENT_TYPE = 'batstateu-counseling-slot';
const ACCESS_TOKEN_KEY = 'spartan-g-google-access-token';

function getDefaultTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila';
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function toISODate(date) {
  return String(date || '').trim();
}

function toISOTIme(time) {
  return String(time || '').trim();
}

function buildDateTime(date, time) {
  return `${toISODate(date)}T${toISOTIme(time)}:00`;
}

function extractDatePart(value) {
  if (!value) return '';
  if (value.length >= 10) return value.slice(0, 10);
  return '';
}

function extractTimePart(value) {
  if (!value) return '';
  const match = value.match(/T(\d{2}:\d{2})/);
  if (match) return match[1];
  return '';
}

function mapBookingStatus(responseStatus, eventStatus = 'confirmed') {
  if (eventStatus === 'cancelled') return 'Cancelled';
  if (responseStatus === 'accepted') return 'Confirmed';
  if (responseStatus === 'declined') return 'Cancelled';
  return 'Pending';
}

function parseNumeric(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

async function calendarRequest(accessToken, path, options = {}) {
  if (!accessToken) {
    throw new Error('Google access token is required.');
  }

  const url = new URL(`${CALENDAR_API_BASE}${path}`);
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || 'Google Calendar request failed.';
    throw new Error(message);
  }

  return payload;
}

function buildSlotEvent({ date, startTime, endTime, maxStudents, facilitatorName, facilitatorEmail }) {
  return {
    summary: `Counseling Slot - ${facilitatorName}`,
    description: [
      'BatStateU counseling slot',
      `Facilitator: ${facilitatorName}`,
      `Facilitator Email: ${facilitatorEmail}`,
      `Max Students: ${maxStudents}`,
      `Slot Type: ${SLOT_EVENT_TYPE}`
    ].join('\n'),
    start: {
      dateTime: buildDateTime(date, startTime),
      timeZone: getDefaultTimeZone()
    },
    end: {
      dateTime: buildDateTime(date, endTime),
      timeZone: getDefaultTimeZone()
    },
    extendedProperties: {
      private: {
        slotType: SLOT_EVENT_TYPE,
        facilitatorName,
        facilitatorEmail,
        maxStudents: String(maxStudents)
      }
    }
  };
}

function toSlotRecord(event) {
  const metadata = event.extendedProperties?.private || {};
  const attendees = Array.isArray(event.attendees) ? event.attendees : [];
  const activeAttendees = attendees.filter((attendee) => attendee.responseStatus !== 'declined');
  const maxStudents = parseNumeric(metadata.maxStudents, activeAttendees.length || 1);
  const startValue = event.start?.dateTime || event.start?.date || '';
  const endValue = event.end?.dateTime || event.end?.date || '';

  return {
    eventId: event.id,
    calendarId: event.organizer?.email || '',
    date: extractDatePart(startValue),
    startTime: extractTimePart(startValue),
    endTime: extractTimePart(endValue),
    facilitatorName: metadata.facilitatorName || event.organizer?.displayName || event.organizer?.email || 'Facilitator',
    facilitatorEmail: metadata.facilitatorEmail || event.organizer?.email || '',
    maxStudents,
    bookedCount: activeAttendees.length,
    spotsAvailable: Math.max(maxStudents - activeAttendees.length, 0),
    isFull: activeAttendees.length >= maxStudents,
    status: event.status === 'cancelled' ? 'cancelled' : 'active',
    attendees: attendees.map((attendee) => ({
      email: normalizeEmail(attendee.email),
      displayName: attendee.displayName || attendee.email || 'Student',
      responseStatus: attendee.responseStatus || 'needsAction'
    }))
  };
}

function toBookingRecords(event) {
  const slot = toSlotRecord(event);
  return slot.attendees.map((attendee) => ({
    bookingId: `${slot.eventId}:${attendee.email}`,
    eventId: slot.eventId,
    studentEmail: attendee.email,
    studentPseudoId: attendee.displayName || attendee.email,
    date: slot.date,
    time: `${slot.startTime} - ${slot.endTime}`,
    facilitatorName: slot.facilitatorName,
    maxStudents: slot.maxStudents,
    spotsAvailable: slot.spotsAvailable,
    status: mapBookingStatus(attendee.responseStatus, event.status)
  }));
}

async function getEvent(accessToken, calendarId, eventId) {
  return calendarRequest(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`);
}

async function patchEvent(accessToken, calendarId, eventId, body) {
  return calendarRequest(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    body
  });
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || '';
}

export async function createSlot(accessToken, { date, startTime, endTime, maxStudents, facilitatorName = 'Facilitator', facilitatorEmail = '' }) {
  const calendarId = import.meta.env.VITE_FACILITATOR_CALENDAR_ID;
  if (!calendarId) {
    throw new Error('Missing VITE_FACILITATOR_CALENDAR_ID.');
  }

  if (!date || !startTime || !endTime) {
    throw new Error('Date, start time, and end time are required.');
  }

  const capacity = parseNumeric(maxStudents, 1);
  const payload = buildSlotEvent({ date, startTime, endTime, maxStudents: capacity, facilitatorName, facilitatorEmail });
  const created = await calendarRequest(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: payload
  });

  return toSlotRecord(created);
}

export async function updateSlot(accessToken, eventId, updatedDetails = {}) {
  const calendarId = import.meta.env.VITE_FACILITATOR_CALENDAR_ID;
  if (!calendarId) {
    throw new Error('Missing VITE_FACILITATOR_CALENDAR_ID.');
  }

  const existingEvent = await getEvent(accessToken, calendarId, eventId);
  const metadata = existingEvent.extendedProperties?.private || {};
  const date = updatedDetails.date || extractDatePart(existingEvent.start?.dateTime || existingEvent.start?.date || '');
  const startTime = updatedDetails.startTime || extractTimePart(existingEvent.start?.dateTime || existingEvent.start?.date || '');
  const endTime = updatedDetails.endTime || extractTimePart(existingEvent.end?.dateTime || existingEvent.end?.date || '');
  const maxStudents = parseNumeric(updatedDetails.maxStudents, parseNumeric(metadata.maxStudents, 1));
  const facilitatorName = updatedDetails.facilitatorName || metadata.facilitatorName || existingEvent.organizer?.displayName || 'Facilitator';
  const facilitatorEmail = updatedDetails.facilitatorEmail || metadata.facilitatorEmail || existingEvent.organizer?.email || '';

  const payload = {
    ...existingEvent,
    summary: `Counseling Slot - ${facilitatorName}`,
    description: [
      'BatStateU counseling slot',
      `Facilitator: ${facilitatorName}`,
      `Facilitator Email: ${facilitatorEmail}`,
      `Max Students: ${maxStudents}`,
      `Slot Type: ${SLOT_EVENT_TYPE}`
    ].join('\n'),
    start: {
      dateTime: buildDateTime(date, startTime),
      timeZone: getDefaultTimeZone()
    },
    end: {
      dateTime: buildDateTime(date, endTime),
      timeZone: getDefaultTimeZone()
    },
    extendedProperties: {
      private: {
        ...(metadata || {}),
        slotType: SLOT_EVENT_TYPE,
        facilitatorName,
        facilitatorEmail,
        maxStudents: String(maxStudents)
      }
    }
  };

  const updated = await patchEvent(accessToken, calendarId, eventId, payload);
  return toSlotRecord(updated);
}

export async function deleteSlot(accessToken, eventId) {
  const calendarId = import.meta.env.VITE_FACILITATOR_CALENDAR_ID;
  if (!calendarId) {
    throw new Error('Missing VITE_FACILITATOR_CALENDAR_ID.');
  }

  await calendarRequest(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE'
  });
  return { eventId };
}

export async function listAllSlots(accessToken, calendarId = import.meta.env.VITE_FACILITATOR_CALENDAR_ID) {
  if (!calendarId) {
    throw new Error('Missing VITE_FACILITATOR_CALENDAR_ID.');
  }

  const response = await calendarRequest(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    query: {
      timeMin: new Date().toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: 2500,
      q: 'Counseling Slot'
    }
  });

  const slots = (response.items || [])
    .filter((event) => event.extendedProperties?.private?.slotType === SLOT_EVENT_TYPE)
    .map(toSlotRecord)
    .filter((slot) => slot.date || slot.startTime || slot.endTime);

  return { slots };
}

export async function bookSlot(accessToken, slotEventId, studentInfo = {}) {
  const calendarId = import.meta.env.VITE_FACILITATOR_CALENDAR_ID;
  if (!calendarId) {
    throw new Error('Missing VITE_FACILITATOR_CALENDAR_ID.');
  }

  const studentEmail = normalizeEmail(studentInfo.email);
  if (!studentEmail) {
    throw new Error('Student email is required to book a slot.');
  }

  const existingEvent = await getEvent(accessToken, calendarId, slotEventId);
  const metadata = existingEvent.extendedProperties?.private || {};
  const maxStudents = parseNumeric(metadata.maxStudents, 1);
  const attendees = Array.isArray(existingEvent.attendees) ? existingEvent.attendees : [];
  const activeAttendees = attendees.filter((attendee) => attendee.responseStatus !== 'declined');

  if (activeAttendees.length >= maxStudents) {
    throw new Error('This slot is already full.');
  }

  const alreadyBooked = attendees.find((attendee) => normalizeEmail(attendee.email) === studentEmail && attendee.responseStatus !== 'declined');
  if (alreadyBooked) {
    throw new Error('You already booked this slot.');
  }

  const nextAttendees = attendees.filter((attendee) => normalizeEmail(attendee.email) !== studentEmail || attendee.responseStatus === 'declined');
  nextAttendees.push({
    email: studentEmail,
    displayName: studentInfo.pseudoId || studentInfo.studentId || studentInfo.name || studentEmail,
    responseStatus: 'needsAction'
  });

  const updated = await patchEvent(accessToken, calendarId, slotEventId, {
    ...existingEvent,
    attendees: nextAttendees,
    extendedProperties: {
      private: {
        ...metadata,
        slotType: SLOT_EVENT_TYPE,
        maxStudents: String(maxStudents)
      }
    }
  });

  return toSlotRecord(updated);
}

export async function cancelBooking(accessToken, slotEventId, studentEmail) {
  const calendarId = import.meta.env.VITE_FACILITATOR_CALENDAR_ID;
  if (!calendarId) {
    throw new Error('Missing VITE_FACILITATOR_CALENDAR_ID.');
  }

  const existingEvent = await getEvent(accessToken, calendarId, slotEventId);
  const attendees = Array.isArray(existingEvent.attendees) ? existingEvent.attendees : [];
  const normalizedEmail = normalizeEmail(studentEmail);
  let matched = false;

  const nextAttendees = attendees.map((attendee) => {
    if (!normalizedEmail || normalizeEmail(attendee.email) === normalizedEmail) {
      matched = true;
      return { ...attendee, responseStatus: 'declined' };
    }
    return attendee;
  });

  if (!matched) {
    throw new Error('Booking not found.');
  }

  const updated = await patchEvent(accessToken, calendarId, slotEventId, {
    ...existingEvent,
    attendees: nextAttendees
  });

  return toSlotRecord(updated);
}

export async function listStudentBookings(accessToken, studentEmail) {
  const calendarId = import.meta.env.VITE_FACILITATOR_CALENDAR_ID;
  if (!calendarId) {
    throw new Error('Missing VITE_FACILITATOR_CALENDAR_ID.');
  }

  const normalizedEmail = normalizeEmail(studentEmail);
  const response = await calendarRequest(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    query: {
      timeMin: new Date().toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: 2500,
      q: 'Counseling Slot'
    }
  });

  const bookings = (response.items || [])
    .filter((event) => event.extendedProperties?.private?.slotType === SLOT_EVENT_TYPE)
    .flatMap((event) => toBookingRecords(event))
    .filter((booking) => booking.studentEmail === normalizedEmail);

  return { bookings };
}

export async function listAllBookings(accessToken, calendarId = import.meta.env.VITE_FACILITATOR_CALENDAR_ID) {
  if (!calendarId) {
    throw new Error('Missing VITE_FACILITATOR_CALENDAR_ID.');
  }

  const response = await calendarRequest(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    query: {
      timeMin: new Date().toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: 2500,
      q: 'Counseling Slot'
    }
  });

  const bookings = (response.items || [])
    .filter((event) => event.extendedProperties?.private?.slotType === SLOT_EVENT_TYPE)
    .flatMap((event) => toBookingRecords(event));

  return { bookings };
}

export async function confirmBooking(accessToken, eventId, studentEmail) {
  const calendarId = import.meta.env.VITE_FACILITATOR_CALENDAR_ID;
  if (!calendarId) {
    throw new Error('Missing VITE_FACILITATOR_CALENDAR_ID.');
  }

  const existingEvent = await getEvent(accessToken, calendarId, eventId);
  const attendees = Array.isArray(existingEvent.attendees) ? existingEvent.attendees : [];
  const normalizedEmail = normalizeEmail(studentEmail);
  let matched = false;

  const nextAttendees = attendees.map((attendee) => {
    if (!normalizedEmail || normalizeEmail(attendee.email) === normalizedEmail) {
      matched = true;
      return { ...attendee, responseStatus: 'accepted' };
    }
    return attendee;
  });

  if (!matched) {
    throw new Error('Booking not found.');
  }

  const updated = await patchEvent(accessToken, calendarId, eventId, {
    ...existingEvent,
    attendees: nextAttendees
  });

  return toSlotRecord(updated);
}
