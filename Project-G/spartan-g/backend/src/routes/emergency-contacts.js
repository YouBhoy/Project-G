import express from 'express';
import { readDb, writeDb } from '../storage/index.js';
import { nowIso } from '../utils/helpers.js';

const router = express.Router();

// Get all emergency contacts (public)
router.get('/', async (req, res) => {
  const db = await readDb();
  return res.json({
    success: true,
    data: {
      emergencyContacts: db.emergencyContacts,
      contacts: db.emergencyContacts
    }
  });
});

// Create emergency contact (admin)
router.post('/', async (req, res) => {
  const { contactType, name, description, phone, email, website, available24_7 = false, priority = 0 } = req.body || {};
  if (!contactType || !name || !phone) {
    return res.status(400).json({ success: false, message: 'contactType, name, phone are required.' });
  }

  const db = await readDb();
  const contact = {
    contactId: db.counters.contactId++,
    contactType,
    name,
    description: description || null,
    phone,
    email: email || null,
    website: website || null,
    available24_7: Boolean(available24_7),
    priority: Number(priority),
    createdAt: nowIso()
  };

  db.emergencyContacts.push(contact);
  await writeDb(db);

  return res.status(201).json({
    success: true,
    data: {
      message: 'Emergency contact created successfully.',
      contact
    }
  });
});

// Update emergency contact (admin)
router.put('/:contactId', async (req, res) => {
  const contactId = Number(req.params.contactId);
  const { contactType, name, description, phone, email, website, available24_7, priority } = req.body || {};
  const db = await readDb();
  const contact = db.emergencyContacts.find((c) => c.contactId === contactId);

  if (!contact) {
    return res.status(404).json({ success: false, message: 'Contact not found.' });
  }

  if (contactType !== undefined) contact.contactType = contactType;
  if (name !== undefined) contact.name = name;
  if (description !== undefined) contact.description = description;
  if (phone !== undefined) contact.phone = phone;
  if (email !== undefined) contact.email = email;
  if (website !== undefined) contact.website = website;
  if (available24_7 !== undefined) contact.available24_7 = Boolean(available24_7);
  if (priority !== undefined) contact.priority = Number(priority);

  await writeDb(db);

  return res.json({
    success: true,
    data: {
      message: 'Emergency contact updated successfully.',
      contact
    }
  });
});

// Delete emergency contact (admin)
router.delete('/:contactId', async (req, res) => {
  const contactId = Number(req.params.contactId);
  const db = await readDb();
  const contactIndex = db.emergencyContacts.findIndex((c) => c.contactId === contactId);

  if (contactIndex === -1) {
    return res.status(404).json({ success: false, message: 'Contact not found.' });
  }

  db.emergencyContacts.splice(contactIndex, 1);
  await writeDb(db);

  return res.json({
    success: true,
    data: { message: 'Emergency contact deleted successfully.' }
  });
});

export default router;
