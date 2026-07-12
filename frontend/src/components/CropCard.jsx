import React, { useState, memo } from "react";

const CropCard = memo(function CropCard({ crop, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(crop.name);
  const [editSeason, setEditSeason] = useState(crop.season);
  const [editWater, setEditWater] = useState(crop.water);

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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    if (onUpdate) {
      await onUpdate(crop.id, { name: editName, season: editSeason, water: editWater });
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={`card crop-card edit-mode ${getSeasonActiveCardClass(editSeason)} animate-fade-in-up`}>
        <form onSubmit={handleSave}>
          <div className="crop-card-header" style={{ flexDirection: "column", gap: "8px", alignItems: "stretch" }}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Crop Name"
              required
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "14px"
              }}
            />
            <select
              value={editSeason}
              onChange={(e) => setEditSeason(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "14px"
              }}
            >
              <option value="Kharif">Kharif (Monsoon)</option>
              <option value="Rabi">Rabi (Winter)</option>
              <option value="Zaid">Zaid (Summer)</option>
              <option value="Annual">Annual / Perennial</option>
            </select>
          </div>
          <div className="crop-card-body" style={{ margin: "10px 0" }}>
            <select
              value={editWater}
              onChange={(e) => setEditWater(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "14px"
              }}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className="crop-card-actions" style={{ display: "flex", gap: "8px" }}>
            <button type="submit" className="btn-primary" style={{ padding: "6px 12px", fontSize: "12px", width: "100%" }}>
              Save
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditName(crop.name);
                setEditSeason(crop.season);
                setEditWater(crop.water);
                setIsEditing(false);
              }}
              style={{ padding: "6px 12px", fontSize: "12px", width: "100%" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

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
      <div className="crop-card-footer" style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="edit-button"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid var(--border-color)",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            fontSize: "12px",
            cursor: "pointer",
            width: "100%"
          }}
        >
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Edit
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Are you sure you want to delete ${crop.name}?`)) {
                onDelete(crop.id);
              }
            }}
            className="delete-button"
            style={{ width: "100%" }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"></path>
            </svg>
            Remove
          </button>
        )}
      </div>
    </div>
  );
});

export default CropCard;
