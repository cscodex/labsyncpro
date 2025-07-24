import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import type { Notification } from '../../contexts/NotificationContext';
import './NotificationContainer.css';

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  const { removeNotification } = useNotification();

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`notification notification-${notification.type}`}>
      <div className="notification-content">
        <div className="notification-header">
          <div className="notification-icon">
            {getIcon()}
          </div>
          <div className="notification-text">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
          </div>
          <button
            className="notification-close"
            onClick={() => removeNotification(notification.id)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
        {notification.action && (
          <div className="notification-action">
            <button
              className="notification-action-btn"
              onClick={notification.action.onClick}
            >
              {notification.action.label}
            </button>
          </div>
        )}
      </div>
      <div className="notification-progress">
        <div 
          className="notification-progress-bar"
          style={{
            animationDuration: `${notification.duration}ms`
          }}
        />
      </div>
    </div>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
