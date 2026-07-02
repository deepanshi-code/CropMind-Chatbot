import React from "react";

export default function NPKBarGauge() {
  const nutrients = [
    { name: "Nitrogen (N)", val: 65, color: "var(--accent-green)", status: "Optimal" },
    { name: "Phosphorus (P)", val: 48, color: "var(--badge-zaid-text)", status: "Moderate" },
    { name: "Potassium (K)", val: 78, color: "var(--badge-rabi-text)", status: "Optimal" }
  ];

  return (
    <div className="card npk-card animate-fade-in-up delay-3">
      <div className="npk-header">
        <div className="npk-title-block">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="var(--accent-green)" strokeWidth="2.5" fill="none">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          <h3>Soil NPK Nutrition</h3>
        </div>
        <span className="ph-badge">pH 6.5 (Ideal)</span>
      </div>
      
      <div className="npk-body">
        {nutrients.map((nut, idx) => (
          <div key={idx} className="npk-row">
            <div className="npk-labels">
              <span className="npk-name">{nut.name}</span>
              <span className="npk-status" style={{ color: nut.color }}>{nut.status} ({nut.val}%)</span>
            </div>
            <div className="npk-progress-track">
              <div 
                className={`npk-progress-bar npk-bar-${idx}`}
                style={{ 
                  width: `${nut.val}%`, 
                  backgroundColor: nut.color
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
