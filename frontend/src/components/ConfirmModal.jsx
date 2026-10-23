import React, { useEffect, useId, useRef } from "react";

/** Confirmation dialog: focuses "Cancel" on open, closes with Escape, returns focus afterwards. */
export default function ConfirmModal({ isOpen, title, message, confirmText = "Delete", cancelText = "Cancel", onConfirm, onCancel, isDanger = true }) {
  const cancelRef = useRef(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onCancel?.(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}>
      <div className="modal-card animate-scale-up" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}>
        <div className="modal-header">
          <div className={`modal-icon ${isDanger ? "danger" : "warning"}`} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"></path>
            </svg>
          </div>
          <h3 id={titleId}>{title}</h3>
        </div>
        <div className="modal-body">
          <p id={messageId}>{message}</p>
        </div>
        <div className="modal-actions">
          <button type="button" ref={cancelRef} className="btn-secondary" onClick={onCancel}>{cancelText}</button>
          <button type="button" className={isDanger ? "btn-danger" : "btn-primary"} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
