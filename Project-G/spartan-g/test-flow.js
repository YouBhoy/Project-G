#!/usr/bin/env node
/**
 * Test flow for slots and appointments sync
 * Tests the complete booking flow:
 * 1. OGC facilitator creates availability slots
 * 2. Student books appointment from those slots
 * 3. Verify slot sync and appointment creation
 */

// Simple test flow script - uses built-in fetch

const API_BASE = 'http://localhost:3001';
const JWT_SECRET = 'spartan-g-dev-secret';

// Test data
const testOGC = {
  email: 'test-ogc@bsu.edu.ph',
  password: 'TestOGCPass123',
  name: 'Dr. Test Counselor',
  assignedCollege: 'CCS'
};

const testStudent = {
  studentId: 'STU-TEST-002',
  password: 'TestStudentPass123',
  name: 'Test Student Two',
  college: 'CCS',
  yearLevel: 2,
  sex: 'F'
};

async function request(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const options = {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) })
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();
    if (!res.ok) {
      console.error(`[ERROR] ${method} ${endpoint}: ${data.message || 'Request failed'}`);
      return null;
    }
    console.log(`[OK] ${method} ${endpoint}`);
    return data.data;
  } catch (err) {
    console.error(`[NETWORK ERROR] ${method} ${endpoint}: ${err.message}`);
    return null;
  }
}

async function runTest() {
  console.log('\n📋 SPARTAN-G APPOINTMENTS & SLOTS TEST FLOW\n');
  
  // 1. Signup/Login OGC
  console.log('1️⃣ OGC FACILITATOR: Signup');
  let ogcRes = await request('/api/auth/signup', 'POST', {
    role: 'ogc',
    ...testOGC
  });
  if (!ogcRes) {
    console.log('   Trying login instead (account may exist)...');
    ogcRes = await request('/api/auth/login', 'POST', {
      role: 'ogc',
      email: testOGC.email,
      password: testOGC.password
    });
  }
  if (!ogcRes || !ogcRes.token) {
    console.error('❌ Failed to setup OGC facilitator');
    return;
  }
  const ogcToken = ogcRes.token;
  const facilitatorId = ogcRes.facilitator?.facilitatorId;
  console.log(`   ✅ OGC logged in as ${testOGC.name} (ID: ${facilitatorId})`);

  // 2. Signup/Login Student
  console.log('\n2️⃣ STUDENT: Signup');
  let studentRes = await request('/api/auth/signup', 'POST', {
    role: 'student',
    ...testStudent
  });
  if (!studentRes) {
    console.log('   Trying login instead (account may exist)...');
    studentRes = await request('/api/auth/login', 'POST', {
      role: 'student',
      studentId: testStudent.studentId,
      password: testStudent.password
    });
  }
  if (!studentRes || !studentRes.token) {
    console.error('❌ Failed to setup student');
    return;
  }
  const studentToken = studentRes.token;
  const studentId = studentRes.student?.studentId;
  console.log(`   ✅ Student logged in as ${testStudent.name} (ID: ${studentId})`);

  // 3. OGC creates availability slots
  console.log('\n3️⃣ OGC: CREATE AVAILABILITY SLOTS');
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const slot1 = await request('/api/ogc/availability', 'POST', {
    slotDate: today,
    startTime: '09:00',
    endTime: '09:30',
    maxSlots: 2
  }, ogcToken);
  if (slot1) console.log(`   ✅ Slot 1 created: ${today} 09:00-09:30`);

  const slot2 = await request('/api/ogc/availability', 'POST', {
    slotDate: tomorrow,
    startTime: '14:00',
    endTime: '14:30',
    maxSlots: 1
  }, ogcToken);
  if (slot2) console.log(`   ✅ Slot 2 created: ${tomorrow} 14:00-14:30`);

  // 4. List OGC's created slots
  console.log('\n4️⃣ OGC: LIST CREATED SLOTS');
  const ogcSlots = await request('/api/ogc/availability', 'GET', null, ogcToken);
  if (ogcSlots) {
    console.log(`   ✅ Found ${ogcSlots.slots?.length || 0} slots`);
    ogcSlots.slots?.forEach((s, i) => {
      console.log(`      Slot ${i+1}: ${s.slotDate} ${s.startTime}-${s.endTime} (${s.bookedCount}/${s.maxSlots} booked)`);
    });
  }

  // 5. Student sees available slots
  console.log('\n5️⃣ STUDENT: GET AVAILABLE SLOTS');
  const availableSlots = await request('/api/student/appointments/available', 'GET', null, studentToken);
  if (availableSlots) {
    console.log(`   ✅ Found ${availableSlots.availableSlots?.length || 0} available slots`);
    availableSlots.availableSlots?.forEach((s, i) => {
      console.log(`      Slot ${i+1}: ${s.slotDate} ${s.startTime}-${s.endTime}`);
    });

    // 6. Student books first available slot
    if (availableSlots.availableSlots?.length > 0) {
      console.log('\n6️⃣ STUDENT: BOOK APPOINTMENT');
      const bookResult = await request('/api/student/appointments/book', 'POST', {
        slotId: availableSlots.availableSlots[0].slotId,
        studentNotes: 'Test booking for mental health check-in'
      }, studentToken);
      if (bookResult) {
        console.log(`   ✅ Appointment booked successfully`);
        console.log(`      Appointment ID: ${bookResult.appointment?.appointmentId}`);
        console.log(`      Status: ${bookResult.appointment?.status}`);
      }
    }
  }

  // 7. Student views their appointments
  console.log('\n7️⃣ STUDENT: VIEW MY APPOINTMENTS');
  const myAppts = await request('/api/student/appointments', 'GET', null, studentToken);
  if (myAppts) {
    console.log(`   ✅ Found ${myAppts.appointments?.length || 0} of my appointments`);
    myAppts.appointments?.forEach((a, i) => {
      console.log(`      Appt ${i+1}: ${a.slotDate} ${a.startTime}-${a.endTime}, Status: ${a.status}`);
    });
  }

  // 8. OGC sees their appointments
  console.log('\n8️⃣ OGC: VIEW THEIR APPOINTMENTS');
  const ogcAppts = await request('/api/ogc/appointments', 'GET', null, ogcToken);
  if (ogcAppts) {
    console.log(`   ✅ Found ${ogcAppts.appointments?.length || 0} appointments to review`);
    ogcAppts.appointments?.forEach((a, i) => {
      console.log(`      Appt ${i+1}: ${a.studentName} on ${a.appointmentDate}, Status: ${a.status}`);
    });

    // 9. OGC approves the appointment
    if (ogcAppts.appointments?.length > 0) {
      console.log('\n9️⃣ OGC: APPROVE APPOINTMENT');
      const apprResult = await request(`/api/ogc/appointments/${ogcAppts.appointments[0].appointmentId}/approve`, 'POST', {
        ogcNotes: 'Approved for mental health counseling'
      }, ogcToken);
      if (apprResult) {
        console.log(`   ✅ Appointment approved`);
      }
    }
  }

  // 10. Verify slots booked count updated
  console.log('\n🔟 VERIFICATION: SLOTS UPDATED');
  const finalSlots = await request('/api/ogc/availability', 'GET', null, ogcToken);
  if (finalSlots) {
    console.log(`   ✅ Final slot states:`);
    finalSlots.slots?.forEach((s, i) => {
      console.log(`      Slot ${i+1}: ${s.slotDate} ${s.startTime}-${s.endTime} (${s.bookedCount}/${s.maxSlots} booked)`);
    });
  }

  console.log('\n✅ TEST COMPLETE!\n');
}

runTest().catch(console.error);
