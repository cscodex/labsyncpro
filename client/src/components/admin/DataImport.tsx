import React, { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import './DataImport.css';

interface ImportResult {
  message: string;
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

const DataImport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'students' | 'computers' | 'instructors'>('students');
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { showSuccess, showError } = useNotification();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      showError('Invalid File', 'Please select a CSV file');
      return;
    }

    setUploading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch(`/api/import/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        showSuccess('Import Completed', `${result.successful}/${result.processed} records imported successfully`);
      } else {
        showError('Import Failed', result.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      showError('Import Failed', 'An error occurred during import');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const downloadTemplate = (type: string) => {
    const templates = {
      students: '/templates/students_import_template.csv',
      computers: '/templates/computers_import_template.csv',
      instructors: '/templates/instructors_import_template.csv'
    };

    const link = document.createElement('a');
    link.href = templates[type as keyof typeof templates];
    link.download = `${type}_import_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderImportSection = (type: 'students' | 'computers' | 'instructors', title: string, description: string) => (
    <div className="import-section">
      <div className="import-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div className="import-actions">
        <div className="template-download">
          <button 
            className="btn-secondary"
            onClick={() => downloadTemplate(type)}
          >
            📥 Download Template
          </button>
          <span className="template-info">Download the CSV template with required headers</span>
        </div>

        <div className="file-upload">
          <label className="upload-label">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileUpload(e, type)}
              disabled={uploading}
              className="file-input"
            />
            <span className="upload-button">
              {uploading ? '⏳ Uploading...' : '📤 Upload CSV File'}
            </span>
          </label>
        </div>
      </div>

      {importResult && (
        <div className="import-result">
          <div className="result-summary">
            <h4>Import Results</h4>
            <div className="result-stats">
              <span className="stat">📊 Processed: {importResult.processed}</span>
              <span className="stat success">✅ Successful: {importResult.successful}</span>
              <span className="stat error">❌ Failed: {importResult.failed}</span>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="result-errors">
              <h5>Errors:</h5>
              <ul>
                {importResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="data-import">
      <div className="page-header">
        <h1>📊 Data Import</h1>
        <p>Import students, computers, and instructors from CSV files</p>
      </div>

      <div className="import-tabs">
        <button 
          className={`tab-button ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          👥 Students
        </button>
        <button 
          className={`tab-button ${activeTab === 'computers' ? 'active' : ''}`}
          onClick={() => setActiveTab('computers')}
        >
          💻 Computers
        </button>
        <button 
          className={`tab-button ${activeTab === 'instructors' ? 'active' : ''}`}
          onClick={() => setActiveTab('instructors')}
        >
          👨‍🏫 Instructors
        </button>
      </div>

      <div className="import-content">
        {activeTab === 'students' && renderImportSection(
          'students',
          'Import Students',
          'Upload a CSV file to import student records. Students will be automatically assigned to default groups for their classes.'
        )}

        {activeTab === 'computers' && renderImportSection(
          'computers',
          'Import Computer Inventory',
          'Upload a CSV file to import computer inventory records. Make sure the lab names match existing labs in the system.'
        )}

        {activeTab === 'instructors' && renderImportSection(
          'instructors',
          'Import Instructors',
          'Upload a CSV file to import instructor records. Instructors will be created with instructor role permissions.'
        )}
      </div>

      <div className="import-instructions">
        <h3>📋 Import Instructions</h3>
        <div className="instructions-grid">
          <div className="instruction-card">
            <h4>1. Download Template</h4>
            <p>Download the CSV template for the data type you want to import. The template includes all required headers and sample data.</p>
          </div>
          <div className="instruction-card">
            <h4>2. Prepare Your Data</h4>
            <p>Fill in the template with your data. Make sure all required fields are completed and follow the format shown in the examples.</p>
          </div>
          <div className="instruction-card">
            <h4>3. Upload CSV File</h4>
            <p>Upload your completed CSV file. The system will validate the data and import valid records while reporting any errors.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataImport;
