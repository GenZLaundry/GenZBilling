import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

const getIconClass = (type: string) => {
  switch (type) {
    case 'danger': return 'fas fa-trash';
    case 'warning': return 'fas fa-exclamation-triangle';
    case 'info': return 'fas fa-info-circle';
    default: return 'fas fa-question-circle';
  }
};

const getIconBgClass = (type: string) => {
  switch (type) {
    case 'danger': return 'alert-icon alert-icon-error';
    case 'warning': return 'alert-icon alert-icon-warning';
    case 'info': return 'alert-icon alert-icon-info';
    default: return 'alert-icon alert-icon-info';
  }
};

const getBtnClass = (type: string) => {
  switch (type) {
    case 'danger': return 'btn btn-danger';
    case 'warning': return 'btn btn-warning';
    case 'info': return 'btn btn-primary';
    default: return 'btn btn-primary';
  }
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning'
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div className={getIconBgClass(type)}>
            <i className={getIconClass(type)}></i>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
            {title}
          </h3>
        </div>

        {/* Message */}
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '14px',
          lineHeight: '1.6',
          margin: '0 0 24px 0',
          whiteSpace: 'pre-line'
        }}>
          {message}
        </p>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '10px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <button className="btn btn-ghost" onClick={onCancel} style={{ flex: 1 }}>
            {cancelText}
          </button>
          <button className={getBtnClass(type)} onClick={onConfirm} style={{ flex: 1 }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
