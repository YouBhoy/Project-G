import React, { useState } from 'react';

export default function EmergencyContactCard({ contact }) {
  const [imgError, setImgError] = useState(false);

  const initials = (() => {
    if (!contact || !contact.name) return '';
    const parts = contact.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <article className="contact-card">
      <div className="contact-header">
        <div className="avatar-wrapper">
          {contact.photo && !imgError ? (
            <img
              src={contact.photo}
              alt={contact.name}
              className="contact-avatar"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="avatar-fallback" title={contact.name}>{initials}</div>
          )}
          <div>
            <h3>{contact.name}</h3>
            {contact.available24_7 && <span className="badge">24/7</span>}
          </div>
        </div>
      </div>

      {contact.contactType && <p className="contact-type">Type: {contact.contactType}</p>}
      {contact.phone && <p><strong>Phone:</strong> <a href={`tel:${contact.phone}`}>{contact.phone}</a></p>}
      {contact.email && <p><strong>Email:</strong> <a href={`mailto:${contact.email}`}>{contact.email}</a></p>}
      {contact.priority && <p><strong>Priority:</strong> <span className={`priority-${contact.priority}`}>{contact.priority}</span></p>}
    </article>
  );
}
