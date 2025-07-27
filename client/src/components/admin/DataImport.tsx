import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../common/LoadingSpinner';
import './DataImport.css';

interface ImportResult {
  message: string;
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

interface GitStatus {
  hasChanges: boolean;
  changes: string[];
  currentBranch: string;
  lastCommit: string;
  status: string;
}

interface GitPushResult {
  success: boolean;
  message: string;
  pushOutput: string;
  lastCommit: string;
  hasChanges: boolean;
  testResults?: {
    success: boolean;
    output: string;
  };
}

const DataImport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'students' | 'computers' | 'instructors'>('students');
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [pushing, setPushing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [pushResult, setPushResult] = useState<GitPushResult | null>(null);
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

  const downloadTemplate = async (type: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/import/templates/${type}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}_import_template.csv`;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      } else {
        console.error('Failed to download template');
        showError('Download Failed', 'Failed to download template file');
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      showError('Download Failed', 'Failed to download template file');
    }
  };

  // GitHub functionality
  const fetchGitStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/git/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const status = await response.json();
        setGitStatus(status);
      } else {
        console.error('Failed to fetch git status');
      }
    } catch (error) {
      console.error('Error fetching git status:', error);
    }
  };

  const handlePushToGitHub = async (runTests = false) => {
    if (!commitMessage.trim()) {
      showError('Commit Message Required', 'Please enter a commit message');
      return;
    }

    if (runTests) {
      setTesting(true);
    } else {
      setPushing(true);
    }
    setPushResult(null);

    try {
      const token = localStorage.getItem('token');
      const endpoint = runTests ? '/api/admin/git/test-and-push' : '/api/admin/git/push';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          commitMessage: commitMessage.trim(),
          runTests
        })
      });

      const result = await response.json();

      if (response.ok) {
        setPushResult(result);
        setCommitMessage('');
        showSuccess('Success', result.message);
        // Refresh git status
        await fetchGitStatus();
      } else {
        showError('Push Failed', result.error || 'Failed to push changes');
        if (result.testResults && !result.testResults.success) {
          setPushResult(result);
        }
      }
    } catch (error) {
      console.error('Error pushing to GitHub:', error);
      showError('Push Failed', 'Failed to push changes to GitHub');
    } finally {
      setPushing(false);
      setTesting(false);
    }
  };

  // Load git status on component mount
  useEffect(() => {
    fetchGitStatus();
  }, []);

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
              {uploading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LoadingSpinner size="small" message="" />
                  Uploading...
                </div>
              ) : (
                '📤 Upload CSV File'
              )}
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

      {/* GitHub Deployment Section */}
      <div className="deployment-section">
        <h3>🚀 GitHub Deployment</h3>
        <p>Push your local changes to GitHub after testing. This will trigger automatic deployment to production.</p>

        <div className="git-status">
          {gitStatus ? (
            <div className="status-info">
              <div className="status-header">
                <span className="branch-info">📍 Branch: <strong>{gitStatus.currentBranch}</strong></span>
                <button
                  className="btn-secondary small"
                  onClick={fetchGitStatus}
                  disabled={pushing || testing}
                >
                  🔄 Refresh
                </button>
              </div>

              <div className="last-commit">
                <span>📝 Last commit: {gitStatus.lastCommit}</span>
              </div>

              {gitStatus.hasChanges ? (
                <div className="changes-info">
                  <span className="changes-badge">⚠️ {gitStatus.changes.length} uncommitted changes</span>
                  <div className="changes-list">
                    {gitStatus.changes.slice(0, 5).map((change, index) => (
                      <div key={index} className="change-item">{change}</div>
                    ))}
                    {gitStatus.changes.length > 5 && (
                      <div className="change-item">... and {gitStatus.changes.length - 5} more</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="no-changes">
                  <span className="status-badge success">✅ No uncommitted changes</span>
                </div>
              )}
            </div>
          ) : (
            <div className="loading-status">
              <LoadingSpinner size="small" message="Loading git status..." />
            </div>
          )}
        </div>

        {gitStatus?.hasChanges && (
          <div className="deployment-actions">
            <div className="commit-input">
              <label htmlFor="commitMessage">Commit Message:</label>
              <input
                id="commitMessage"
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Describe your changes..."
                disabled={pushing || testing}
                className="commit-message-input"
              />
            </div>

            <div className="push-buttons">
              <button
                className="btn-primary"
                onClick={() => handlePushToGitHub(false)}
                disabled={!commitMessage.trim() || pushing || testing}
              >
                {pushing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LoadingSpinner size="small" message="" />
                    Pushing...
                  </div>
                ) : (
                  '📤 Push to GitHub'
                )}
              </button>

              <button
                className="btn-secondary"
                onClick={() => handlePushToGitHub(true)}
                disabled={!commitMessage.trim() || pushing || testing}
              >
                {testing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LoadingSpinner size="small" message="" />
                    Testing & Pushing...
                  </div>
                ) : (
                  '🧪 Test & Push'
                )}
              </button>
            </div>
          </div>
        )}

        {pushResult && (
          <div className={`push-result ${pushResult.success ? 'success' : 'error'}`}>
            <h4>{pushResult.success ? '✅ Success' : '❌ Failed'}</h4>
            <p>{pushResult.message}</p>

            {pushResult.testResults && (
              <div className="test-results">
                <h5>Test Results:</h5>
                <pre className={`test-output ${pushResult.testResults.success ? 'success' : 'error'}`}>
                  {pushResult.testResults.output}
                </pre>
              </div>
            )}

            {pushResult.success && pushResult.pushOutput && (
              <div className="push-output">
                <h5>Push Output:</h5>
                <pre className="git-output">{pushResult.pushOutput}</pre>
              </div>
            )}
          </div>
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
