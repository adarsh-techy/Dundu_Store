import React from 'react';
import './NotificationModal.css';

/**
 * NotificationModal — Blocking centered dialog.
 * Use ONLY for confirm / destructive / warning dialogs that require user action.
 * For transient feedback (success, error, info) use ToastNotification instead.
 *
 * types: 'confirm' | 'warning' | 'info'
 */
export default function NotificationModal({
  isOpen,
  type = 'confirm', // 'confirm' | 'warning' | 'info'
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  onClose,
}) {
  if (!isOpen) return null;

  const icons = {
    confirm: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    info: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  };

  const handleClose = onClose || onCancel;

  return (
    <div className="notif-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose?.(); }}>
      <div className={`notif-modal-card ${type}`} role="dialog" aria-modal="true" aria-labelledby="notif-title">

        <button className="notif-close-btn" onClick={handleClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={`notif-icon-circle ${type}`}>
          {icons[type] || icons.info}
        </div>

        <h3 className="notif-title" id="notif-title">
          {title || (type === 'confirm' ? 'Are you sure?' : 'Heads Up!')}
        </h3>
        <p className="notif-message">{message}</p>

        <div className="notif-actions">
          {onCancel && (
            <button className="notif-cancel-btn" onClick={onCancel}>
              {cancelText}
            </button>
          )}
          <button
            className={`notif-confirm-btn ${type}`}
            onClick={() => {
              if (onConfirm) onConfirm();
              if (!onConfirm && onClose) onClose();
            }}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}
