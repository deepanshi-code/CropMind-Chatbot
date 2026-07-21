import React from "react";

export default function EmptyState({ title = "No Items Found", message = "No records currently exist in this database catalog.", icon, actionText, onAction }) {
  return (
    <div className="card empty-state-card animate-fade-in">
      <div className="empty-state-icon">
        {icon || (
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <line x1="9" y1="13" x2="15" y2="13"></line>
          </svg>
        )}
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {actionText && onAction && (
        <button type="button" className="btn-primary btn-sm" onClick={onAction} style={{ marginTop: "16px" }}>
          {actionText}
        </button>
      )}
    </div>
  );
}
