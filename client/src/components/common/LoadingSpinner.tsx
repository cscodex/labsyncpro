import React from 'react';
import LabSyncProLogo from './LabSyncProLogo';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message = 'Loading...',
  fullScreen = false,
  className = ''
}) => {
  return (
    <div className={`loading-spinner-container ${fullScreen ? 'fullscreen' : ''} ${className}`}>
      <div className="loading-content">
        <LabSyncProLogo 
          size={size} 
          animated={true} 
          showText={size !== 'small'} 
        />
        {message && (
          <div className="loading-message">
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;
