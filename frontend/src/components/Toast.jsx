import React from "react";

export default function Toast({ toast, onClose }) {
  if (!toast || !toast.message) return null;

  const type = toast.type || "info"; // "success", "error", "info"

  const getIcon = () => {
    if (type === "success") {
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent-green)" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      );
    }
    if (type === "error") {
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent-red)" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    );
  };

  return (
    <div className="toast-overlay animate-fade-in">
      <div className={`toast-card ${type}`}>
        <div className="toast-icon">{getIcon()}</div>
        <div className="toast-content">
          <h4>{toast.title || (type === "error" ? "System Error" : type === "success" ? "Success" : "Notification")}</h4>
          <p>{toast.message}</p>
        </div>
        <button className="toast-close" onClick={onClose} aria-label="Close Toast">
          &times;
        </button>
      </div>
    </div>
  );
}
