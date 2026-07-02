import React, { memo } from "react";

const CropCard = memo(function CropCard({ crop, onDelete }) {
  const getSeasonClass = (season) => {
    if (!season) return "badge-other";
    const s = season.toLowerCase();
    if (s.includes("rabi")) return "badge-rabi";
    if (s.includes("kharif")) return "badge-kharif";
    return "badge-zaid";
  };

  const getSeasonActiveCardClass = (season) => {
    if (!season) return "badge-other-active";
    const s = season.toLowerCase();
    if (s.includes("rabi")) return "badge-rabi-active";
    if (s.includes("kharif")) return "badge-kharif-active";
    if (s.includes("zaid")) return "badge-zaid-active";
    return "badge-other-active";
  };

  return (
    <div className={`card crop-card ${getSeasonActiveCardClass(crop.season)} animate-fade-in-up`}>
      <div className="crop-card-header">
        <h3>{crop.name}</h3>
        <span className={`badge ${getSeasonClass(crop.season)}`}>
          {crop.season}
        </span>
      </div>
      <div className="crop-card-body">
        <p><strong>Water Requirement:</strong> {crop.water}</p>
      </div>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Are you sure you want to delete ${crop.name}?`)) {
              onDelete(crop.id);
            }
          }}
          className="delete-button"
        >
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"></path>
          </svg>
          Remove
        </button>
      )}
    </div>
  );
});

export default CropCard;
