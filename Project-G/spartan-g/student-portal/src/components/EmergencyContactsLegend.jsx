import React from 'react';

export default function EmergencyContactsLegend() {
  return (
    <div className="contacts-legend">
      <div className="legend-scale" aria-hidden>
        <div className="legend-pill">1</div>
        <div className="legend-pill">2</div>
        <div className="legend-pill">3</div>
        <div className="legend-pill">4</div>
      </div>
      <h4>Priority Legend</h4>
      <div className="legend-items">
        <div className="legend-item"><span className="legend-dot low"/> <strong>Low:</strong> Routine information or non-urgent services.</div>
        <div className="legend-item"><span className="legend-dot medium"/> <strong>Medium:</strong> Time-sensitive support; respond during office hours.</div>
        <div className="legend-item"><span className="legend-dot high"/> <strong>High:</strong> Urgent support recommended; escalate promptly.</div>
        <div className="legend-item"><span className="legend-dot severe"/> <strong>Severe:</strong> Immediate emergency response required (call now).</div>
      </div>
    </div>
  );
}
