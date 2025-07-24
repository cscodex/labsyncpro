import React, { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';

interface ExportButtonProps {
  exportType: 'assignments' | 'grades' | 'submissions';
  filters?: Record<string, string | undefined>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  children?: React.ReactNode;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  exportType,
  filters = {},
  className = '',
  size = 'md',
  variant = 'outline',
  children
}) => {
  const [exporting, setExporting] = useState(false);
  const { showNotification } = useNotification();

  const handleExport = async () => {
    setExporting(true);

    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`/api/export/${exportType}?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Get filename from response headers or create default
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : `${exportType}_export_${new Date().toISOString().split('T')[0]}.csv`;
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        showNotification(`${exportType.charAt(0).toUpperCase() + exportType.slice(1)} exported successfully`, 'success');
      } else {
        const error = await response.json();
        showNotification(error.error || 'Export failed', 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'btn-sm';
      case 'lg': return 'btn-lg';
      default: return '';
    }
  };

  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'btn-primary';
      case 'secondary': return 'btn-secondary';
      case 'outline': return 'btn-outline';
      default: return 'btn-outline';
    }
  };

  return (
    <button
      className={`btn ${getVariantClass()} ${getSizeClass()} export-btn ${className}`}
      onClick={handleExport}
      disabled={exporting}
      title={`Export ${exportType} to CSV`}
    >
      {exporting ? (
        <>
          <span className="spinner">⏳</span>
          Exporting...
        </>
      ) : (
        children || (
          <>
            📤 Export CSV
          </>
        )
      )}
    </button>
  );
};

export default ExportButton;
