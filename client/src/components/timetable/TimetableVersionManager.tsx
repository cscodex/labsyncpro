import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { timetableService } from '../../services/timetableService';
import type { TimetableVersion, VersionComparison, ValidationResult } from '../../types/timetable';

interface TimetableVersionManagerProps {
  versions: TimetableVersion[];
  activeVersion: TimetableVersion | null;
  onVersionChange: (versionId: string) => void;
  onVersionCreated: () => void;
  onClose: () => void;
}

const TimetableVersionManager: React.FC<TimetableVersionManagerProps> = ({
  versions,
  activeVersion,
  onVersionChange,
  onVersionCreated,
  onClose
}) => {
  const { showSuccess, showError } = useNotification();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    versionName: '',
    description: '',
    effectiveFrom: '',
    copyFromVersion: '',
    copySchedules: false
  });

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.versionName || !createForm.effectiveFrom) {
      showError('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const result = await timetableService.createTimetableVersion({
        versionName: createForm.versionName,
        description: createForm.description,
        effectiveFrom: createForm.effectiveFrom,
        copyFromVersion: createForm.copyFromVersion || undefined,
        copySchedules: createForm.copySchedules
      });

      showSuccess(
        'Success',
        `Timetable version "${result.version.version_name}" created successfully`
      );
      
      setCreateForm({
        versionName: '',
        description: '',
        effectiveFrom: '',
        copyFromVersion: '',
        copySchedules: false
      });
      
      setShowCreateForm(false);
      onVersionCreated();
      
    } catch (err) {
      console.error('Failed to create version:', err);
      showError('Error', 'Failed to create timetable version');
    } finally {
      setLoading(false);
    }
  };

  // Determine which version is effective for a given date
  const getEffectiveVersion = (date: string = new Date().toISOString().split('T')[0]) => {
    const targetDate = new Date(date);

    // Find the version that should be active on the target date
    const effectiveVersion = allVersions
      .filter(v => new Date(v.effective_from) <= targetDate)
      .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime())[0];

    return effectiveVersion;
  };

  // Check if a version is currently effective
  const isVersionEffective = (version: any, date: string = new Date().toISOString().split('T')[0]) => {
    const targetDate = new Date(date);
    const effectiveFrom = new Date(version.effective_from);
    const effectiveUntil = version.effective_until ? new Date(version.effective_until) : null;

    return effectiveFrom <= targetDate && (!effectiveUntil || targetDate < effectiveUntil);
  };

  const handleCompareVersions = async () => {
    if (selectedVersions.length !== 2) {
      showError('Error', 'Please select exactly 2 versions to compare');
      return;
    }

    try {
      setLoading(true);
      
      const comparisonResult = await timetableService.compareTimetableVersions(
        selectedVersions[0],
        selectedVersions[1]
      );
      
      setComparison(comparisonResult);
      setShowComparison(true);
      
    } catch (err) {
      console.error('Failed to compare versions:', err);
      showError('Error', 'Failed to compare timetable versions');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateVersion = async (versionId: string) => {
    try {
      setLoading(true);
      
      const validationResult = await timetableService.validateTimetableVersion(versionId);
      setValidation(validationResult);
      setShowValidation(true);
      
    } catch (err) {
      console.error('Failed to validate version:', err);
      showError('Error', 'Failed to validate timetable version');
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelection = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      } else {
        return [prev[1], versionId];
      }
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content version-manager-modal">
        <div className="modal-header">
          <h2>Timetable Version Management</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {/* Action Buttons */}
          <div className="version-actions">
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
              disabled={loading}
            >
              <i className="fas fa-plus"></i>
              Create New Version
            </button>
            
            <button
              className="btn btn-outline"
              onClick={handleCompareVersions}
              disabled={selectedVersions.length !== 2 || loading}
            >
              <i className="fas fa-balance-scale"></i>
              Compare Selected ({selectedVersions.length}/2)
            </button>
          </div>

          {/* Versions List */}
          <div className="versions-list">
            <h3>Timetable Versions</h3>
            
            {versions.length === 0 ? (
              <div className="empty-state">
                <p>No timetable versions found</p>
              </div>
            ) : (
              <div className="versions-table">
                <table>
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Version</th>
                      <th>Name</th>
                      <th>Effective From</th>
                      <th>Status</th>
                      <th>Periods</th>
                      <th>Schedules</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map(version => (
                      <tr
                        key={version.id}
                        className={version.is_active ? 'active-version' : ''}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedVersions.includes(version.id)}
                            onChange={() => handleVersionSelection(version.id)}
                          />
                        </td>
                        <td>
                          <span className="version-number">
                            {version.version_number}
                          </span>
                        </td>
                        <td>
                          <div className="version-info">
                            <strong>{version.version_name}</strong>
                            {version.description && (
                              <small>{version.description}</small>
                            )}
                          </div>
                        </td>
                        <td>
                          {timetableService.formatDate(version.effective_from)}
                        </td>
                        <td>
                          <span className={`status-badge ${isVersionEffective(version) ? 'active' : 'inactive'}`}>
                            {isVersionEffective(version) ? 'Effective' : 'Future'}
                          </span>
                          {isVersionEffective(version) && (
                            <small className="text-muted d-block">Current</small>
                          )}
                        </td>
                        <td>{version.period_count || 0}</td>
                        <td>
                          <div className="schedule-counts">
                            <span>Total: {version.schedule_count || 0}</span>
                            <span>Active: {version.active_schedule_count || 0}</span>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => handleValidateVersion(version.id)}
                              disabled={loading}
                              title="Validate Version"
                            >
                              <i className="fas fa-check-circle"></i>
                            </button>

                            <button
                              className="btn btn-sm btn-info"
                              onClick={() => {/* TODO: View version details */}}
                              disabled={loading}
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Create Version Form Modal */}
        {showCreateForm && (
          <div className="modal-overlay">
            <div className="modal-content create-version-modal">
              <div className="modal-header">
                <h3>Create New Timetable Version</h3>
                <button
                  className="close-btn"
                  onClick={() => setShowCreateForm(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={handleCreateVersion} className="modal-body">
                <div className="form-group">
                  <label htmlFor="versionName">Version Name *</label>
                  <input
                    type="text"
                    id="versionName"
                    value={createForm.versionName}
                    onChange={(e) => setCreateForm(prev => ({
                      ...prev,
                      versionName: e.target.value
                    }))}
                    placeholder="e.g., Spring 2024 Timetable"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    placeholder="Optional description of changes"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="effectiveFrom">Effective From Date (WEF) *</label>
                  <input
                    type="date"
                    id="effectiveFrom"
                    value={createForm.effectiveFrom}
                    onChange={(e) => setCreateForm(prev => ({
                      ...prev,
                      effectiveFrom: e.target.value
                    }))}
                    required
                  />
                  <small className="form-help">
                    All schedules on or after this date will use the new timetable version
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="copyFromVersion">Copy From Version</label>
                  <select
                    id="copyFromVersion"
                    value={createForm.copyFromVersion}
                    onChange={(e) => setCreateForm(prev => ({
                      ...prev,
                      copyFromVersion: e.target.value
                    }))}
                  >
                    <option value="">Start with empty periods</option>
                    {versions.map(version => (
                      <option key={version.id} value={version.id}>
                        {version.version_number} - {version.version_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={createForm.copySchedules}
                      onChange={(e) => setCreateForm(prev => ({
                        ...prev,
                        copySchedules: e.target.checked
                      }))}
                    />
                    Copy future schedules to new version
                  </label>
                  <small className="form-help">
                    Migrate all scheduled sessions from the effective date onwards
                  </small>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create Version'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Comparison Modal */}
        {showComparison && comparison && (
          <div className="modal-overlay">
            <div className="modal-content comparison-modal">
              <div className="modal-header">
                <h3>Version Comparison</h3>
                <button
                  className="close-btn"
                  onClick={() => setShowComparison(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="modal-body">
                <div className="comparison-summary">
                  <h4>Summary</h4>
                  <p>
                    {comparison.summary.periodsChanged} out of {comparison.summary.totalPeriods} periods have changes
                  </p>
                  <p>
                    Schedule count: Version 1 has {comparison.schedules.version1_count} schedules, 
                    Version 2 has {comparison.schedules.version2_count} schedules
                  </p>
                </div>

                <div className="period-changes">
                  <h4>Period Changes</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Change Type</th>
                        <th>Version 1</th>
                        <th>Version 2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.periods.map((period, index) => (
                        <tr key={index} className={`change-${period.change_type}`}>
                          <td>Period {period.period_number}</td>
                          <td>
                            <span className={`change-badge ${period.change_type}`}>
                              {period.change_type}
                            </span>
                          </td>
                          <td>
                            {period.version1_name && (
                              <div>
                                <strong>{period.version1_name}</strong>
                                <br />
                                {period.version1_start} - {period.version1_end}
                              </div>
                            )}
                          </td>
                          <td>
                            {period.version2_name && (
                              <div>
                                <strong>{period.version2_name}</strong>
                                <br />
                                {period.version2_start} - {period.version2_end}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Modal */}
        {showValidation && validation && (
          <div className="modal-overlay">
            <div className="modal-content validation-modal">
              <div className="modal-header">
                <h3>Version Validation Results</h3>
                <button
                  className="close-btn"
                  onClick={() => setShowValidation(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="modal-body">
                <div className={`validation-status ${validation.isValid ? 'valid' : 'invalid'}`}>
                  <i className={`fas ${validation.isValid ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
                  <h4>
                    {validation.isValid ? 'Version is Valid' : 'Validation Issues Found'}
                  </h4>
                  <p>Validated at: {new Date(validation.validatedAt).toLocaleString()}</p>
                </div>

                {validation.issues.length > 0 && (
                  <div className="validation-issues">
                    <h4>Issues Found:</h4>
                    {validation.issues.map((issue, index) => (
                      <div key={index} className="issue-item">
                        <h5>{issue.type.replace(/_/g, ' ').toUpperCase()}</h5>
                        <p>{issue.description}</p>
                        
                        {issue.count && (
                          <p>Count: {issue.count}</p>
                        )}
                        
                        {issue.gaps && (
                          <ul>
                            {issue.gaps.map((gap, gapIndex) => (
                              <li key={gapIndex}>{gap}</li>
                            ))}
                          </ul>
                        )}
                        
                        {issue.overlaps && (
                          <ul>
                            {issue.overlaps.map((overlap, overlapIndex) => (
                              <li key={overlapIndex}>
                                {overlap.period1} overlaps with {overlap.period2}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableVersionManager;
