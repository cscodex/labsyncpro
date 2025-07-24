import React from 'react';
import './ConfirmationDialog.css';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return '⚠️';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && !loading) {
      onConfirm();
    }
  };

  return (
    <div 
      className="confirmation-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className={`confirmation-dialog confirmation-${type}`}>
        <div className="confirmation-header">
          <div className="confirmation-icon">
            {getIcon()}
          </div>
          <div className="confirmation-title">
            {title}
          </div>
        </div>
        
        <div className="confirmation-content">
          <p className="confirmation-message">
            {message}
          </p>
        </div>
        
        <div className="confirmation-actions">
          <button
            className="confirmation-btn confirmation-btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={`confirmation-btn confirmation-btn-confirm confirmation-btn-${type}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="confirmation-loading">
                <span className="confirmation-spinner"></span>
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
