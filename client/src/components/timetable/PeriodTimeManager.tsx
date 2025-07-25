// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { timetableService } from '../../services/timetableService';
import type { TimetableVersion, Period } from '../../types/timetable';

interface PeriodTimeManagerProps {
  version: TimetableVersion;
  periods: Period[];
  onPeriodsUpdated: () => void;
  onClose: () => void;
}

const PeriodTimeManager: React.FC<PeriodTimeManagerProps> = ({
  version,
  periods,
  onPeriodsUpdated,
  onClose
}) => {
  const { showNotification } = useNotification();
  
  const [editedPeriods, setEditedPeriods] = useState<Partial<Period>[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWEFModal, setShowWEFModal] = useState(false);
  const [wefDate, setWefDate] = useState('');
  const [createNewVersion, setCreateNewVersion] = useState(false);

  useEffect(() => {
    // Initialize with current periods
    setEditedPeriods(periods.map(period => ({
      id: period.id,
      periodNumber: period.period_number,
      periodName: period.period_name,
      startTime: period.start_time,
      endTime: period.end_time,
      lectureDurationMinutes: period.lecture_duration_minutes || 90,
      numberOfLectures: period.number_of_lectures || 1,
      isBreak: period.is_break,
      breakDurationMinutes: period.break_duration_minutes,
      displayOrder: period.display_order
    })));
  }, [periods]);

  const addPeriod = () => {
    const newPeriod: Partial<Period> = {
      periodNumber: editedPeriods.length + 1,
      periodName: `Period ${editedPeriods.length + 1}`,
      startTime: '09:00:00',
      endTime: '10:30:00',
      lectureDurationMinutes: 90,
      numberOfLectures: 1,
      isBreak: false,
      breakDurationMinutes: 0,
      displayOrder: editedPeriods.length + 1
    };

    setEditedPeriods([...editedPeriods, newPeriod]);
  };

  const removePeriod = (index: number) => {
    const newPeriods = editedPeriods.filter((_, i) => i !== index);
    // Reorder remaining periods
    const reorderedPeriods = newPeriods.map((period, i) => ({
      ...period,
      periodNumber: i + 1,
      displayOrder: i + 1
    }));
    setEditedPeriods(reorderedPeriods);
  };

  const updatePeriod = (index: number, field: string, value: any) => {
    const newPeriods = [...editedPeriods];
    newPeriods[index] = {
      ...newPeriods[index],
      [field]: value
    };
    setEditedPeriods(newPeriods);
  };

  const validatePeriods = (): string[] => {
    const errors: string[] = [];
    
    editedPeriods.forEach((period, index) => {
      // Check required fields
      if (!period.periodName?.trim()) {
        errors.push(`Period ${index + 1}: Name is required`);
      }
      
      if (!period.startTime || !period.endTime) {
        errors.push(`Period ${index + 1}: Start and end times are required`);
      }
      
      // Check time validity
      if (period.startTime && period.endTime) {
        const start = new Date(`2000-01-01T${period.startTime}`);
        const end = new Date(`2000-01-01T${period.endTime}`);
        
        if (start >= end) {
          errors.push(`Period ${index + 1}: End time must be after start time`);
        }
      }
      
      // Check for overlaps with other periods
      editedPeriods.forEach((otherPeriod, otherIndex) => {
        if (index !== otherIndex && period.startTime && period.endTime && 
            otherPeriod.startTime && otherPeriod.endTime) {
          
          const start1 = new Date(`2000-01-01T${period.startTime}`);
          const end1 = new Date(`2000-01-01T${period.endTime}`);
          const start2 = new Date(`2000-01-01T${otherPeriod.startTime}`);
          const end2 = new Date(`2000-01-01T${otherPeriod.endTime}`);
          
          if (start1 < end2 && start2 < end1) {
            errors.push(`Period ${index + 1} overlaps with Period ${otherIndex + 1}`);
          }
        }
      });
    });
    
    return errors;
  };

  const handleSave = async () => {
    const errors = validatePeriods();
    if (errors.length > 0) {
      showNotification(`Validation errors: ${errors.join(', ')}`, 'error');
      return;
    }

    // Check if this is a significant change that requires WEF date
    const hasSignificantChanges = editedPeriods.some((period, index) => {
      const original = periods[index];
      return !original || 
             period.startTime !== original.start_time ||
             period.endTime !== original.end_time ||
             period.periodName !== original.period_name;
    }) || editedPeriods.length !== periods.length;

    if (hasSignificantChanges && version.is_active) {
      setShowWEFModal(true);
      return;
    }

    await savePeriods();
  };

  const savePeriods = async (newVersionId?: string) => {
    try {
      setLoading(true);
      
      const versionId = newVersionId || version.id;
      await timetableService.updatePeriodsForVersion(versionId, editedPeriods);
      
      showNotification('Periods updated successfully', 'success');
      onPeriodsUpdated();
      
    } catch (err) {
      console.error('Failed to update periods:', err);
      showNotification('Failed to update periods', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWEFSave = async () => {
    if (!wefDate) {
      showNotification('Please select an effective date', 'error');
      return;
    }

    try {
      setLoading(true);
      
      if (createNewVersion) {
        // Create new version with updated periods
        const result = await timetableService.createTimetableVersion({
          versionName: `${version.version_name} - Updated Periods`,
          description: `Updated period times effective from ${wefDate}`,
          effectiveFrom: wefDate,
          copyFromVersion: version.id,
          copySchedules: true
        });
        
        // Update periods in the new version
        await savePeriods(result.version.id);
        
        showNotification(
          `New timetable version created with updated periods (${result.version.version_number})`,
          'success'
        );
      } else {
        // Update current version with new effective date
        await timetableService.activateTimetableVersion(version.id, wefDate);
        await savePeriods();
        
        showNotification('Periods updated with new effective date', 'success');
      }
      
      setShowWEFModal(false);
      setWefDate('');
      setCreateNewVersion(false);
      
    } catch (err) {
      console.error('Failed to save with WEF date:', err);
      showNotification('Failed to save periods with effective date', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (startTime: string, endTime: string): string => {
    if (!startTime || !endTime) return '';
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content period-manager-modal">
        <div className="modal-header">
          <h2>Period Time Management</h2>
          <div className="version-info">
            <span className="version-badge">
              {version.version_number} - {version.version_name}
            </span>
            {version.is_active && (
              <span className="active-badge">Active</span>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <div className="periods-editor">
            <div className="editor-header">
              <h3>Configure Period Times</h3>
              <button
                className="btn btn-outline"
                onClick={addPeriod}
                disabled={loading}
              >
                <i className="fas fa-plus"></i>
                Add Period
              </button>
            </div>

            <div className="periods-list">
              {editedPeriods.map((period, index) => (
                <div key={index} className="period-item">
                  <div className="period-header">
                    <span className="period-number">Period {period.periodNumber}</span>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => removePeriod(index)}
                      disabled={loading}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>

                  <div className="period-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Period Name</label>
                        <input
                          type="text"
                          value={period.periodName || ''}
                          onChange={(e) => updatePeriod(index, 'periodName', e.target.value)}
                          placeholder="e.g., Morning Session"
                        />
                      </div>

                      <div className="form-group">
                        <label>Start Time</label>
                        <input
                          type="time"
                          value={period.startTime || ''}
                          onChange={(e) => updatePeriod(index, 'startTime', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>End Time</label>
                        <input
                          type="time"
                          value={period.endTime || ''}
                          onChange={(e) => updatePeriod(index, 'endTime', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Total Duration</label>
                        <div className="duration-display">
                          {formatDuration(period.startTime || '', period.endTime || '')}
                        </div>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Lecture Duration (minutes)</label>
                        <input
                          type="number"
                          min="15"
                          max="180"
                          step="15"
                          value={period.lectureDurationMinutes || 90}
                          onChange={(e) => updatePeriod(index, 'lectureDurationMinutes', parseInt(e.target.value))}
                          placeholder="90"
                        />
                      </div>

                      <div className="form-group">
                        <label>Number of Lectures</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={period.numberOfLectures || 1}
                          onChange={(e) => updatePeriod(index, 'numberOfLectures', parseInt(e.target.value))}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={period.isBreak || false}
                            onChange={(e) => updatePeriod(index, 'isBreak', e.target.checked)}
                          />
                          This is a break period
                        </label>
                      </div>

                      {period.isBreak && (
                        <div className="form-group">
                          <label>Break Duration (minutes)</label>
                          <input
                            type="number"
                            min="0"
                            max="60"
                            value={period.breakDurationMinutes || 0}
                            onChange={(e) => updatePeriod(index, 'breakDurationMinutes', parseInt(e.target.value))}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {editedPeriods.length === 0 && (
              <div className="empty-state">
                <p>No periods configured. Click "Add Period" to get started.</p>
              </div>
            )}
          </div>

          <div className="periods-preview">
            <h4>Daily Schedule Preview</h4>
            <div className="schedule-timeline">
              {editedPeriods
                .filter(p => p.startTime && p.endTime)
                .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                .map((period, index) => (
                  <div
                    key={index}
                    className={`timeline-item ${period.isBreak ? 'break-period' : 'lecture-period'}`}
                  >
                    <div className="time-range">
                      {timetableService.formatTime(period.startTime || '')} - 
                      {timetableService.formatTime(period.endTime || '')}
                    </div>
                    <div className="period-info">
                      <strong>{period.periodName}</strong>
                      <span className="duration">
                        {formatDuration(period.startTime || '', period.endTime || '')}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* WEF Date Modal */}
        {showWEFModal && (
          <div className="modal-overlay">
            <div className="modal-content wef-modal">
              <div className="modal-header">
                <h3>Set Effective Date (WEF)</h3>
                <button
                  className="close-btn"
                  onClick={() => setShowWEFModal(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="modal-body">
                <div className="wef-explanation">
                  <p>
                    You are making significant changes to period times. This will affect all future schedules.
                    Please specify when these changes should take effect.
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="wefDate">Effective From Date</label>
                  <input
                    type="date"
                    id="wefDate"
                    value={wefDate}
                    onChange={(e) => setWefDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <small className="form-help">
                    All schedules on or after this date will use the new period times
                  </small>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={createNewVersion}
                      onChange={(e) => setCreateNewVersion(e.target.checked)}
                    />
                    Create new timetable version
                  </label>
                  <small className="form-help">
                    Recommended: Creates a new version to preserve historical data
                  </small>
                </div>

                <div className="version-control-info">
                  <h4>What happens next:</h4>
                  <ul>
                    {createNewVersion ? (
                      <>
                        <li>A new timetable version will be created</li>
                        <li>Future schedules will be migrated to the new version</li>
                        <li>Historical schedules remain unchanged</li>
                      </>
                    ) : (
                      <>
                        <li>Current version will be updated</li>
                        <li>All schedules will use new period times</li>
                        <li>Historical data may be affected</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowWEFModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleWEFSave}
                  disabled={loading || !wefDate}
                >
                  {loading ? 'Applying...' : 'Apply Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PeriodTimeManager;
