import React from 'react';
import './LabSyncProLogo.css';

interface LabSyncProLogoProps {
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  showText?: boolean;
  className?: string;
}

const LabSyncProLogo: React.FC<LabSyncProLogoProps> = ({
  size = 'medium',
  animated = true,
  showText = true,
  className = ''
}) => {
  return (
    <div className={`labsyncpro-logo ${size} ${animated ? 'animated' : ''} ${className}`}>
      {/* Logo Icon */}
      <div className="logo-icon">
        {/* Outer Ring */}
        <div className="logo-ring outer-ring">
          <div className="ring-segment segment-1"></div>
          <div className="ring-segment segment-2"></div>
          <div className="ring-segment segment-3"></div>
          <div className="ring-segment segment-4"></div>
        </div>
        
        {/* Inner Ring */}
        <div className="logo-ring inner-ring">
          <div className="ring-segment segment-1"></div>
          <div className="ring-segment segment-2"></div>
          <div className="ring-segment segment-3"></div>
        </div>
        
        {/* Center Core */}
        <div className="logo-core">
          <div className="core-dot"></div>
          <div className="core-pulse"></div>
        </div>
        
        {/* Connection Lines */}
        <div className="connection-lines">
          <div className="line line-1"></div>
          <div className="line line-2"></div>
          <div className="line line-3"></div>
          <div className="line line-4"></div>
        </div>
      </div>
      
      {/* Logo Text */}
      {showText && (
        <div className="logo-text">
          <span className="logo-lab">Lab</span>
          <span className="logo-sync">Sync</span>
          <span className="logo-pro">Pro</span>
        </div>
      )}
    </div>
  );
};

export default LabSyncProLogo;
