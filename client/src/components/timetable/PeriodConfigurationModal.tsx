import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { timetableService } from '../../services/timetableService';
import type {
  TimetableVersion,
  TimetableConfig,
  PeriodGenerationConfig,
  PeriodGenerationResult,
  GeneratedPeriod,
  BreakConfiguration
} from '../../types/timetable';
import './PeriodConfigurationModal.css';

interface PeriodConfigurationModalProps {
  version: TimetableVersion;
  config: TimetableConfig | null;
  onConfigUpdated: () => void;
  onClose: () => void;
}

const PeriodConfigurationModal: React.FC<PeriodConfigurationModalProps> = ({
  version,
  config,
  onConfigUpdated,
  onClose
}) => {
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [schoolStartTime, setSchoolStartTime] = useState('08:00:00');
  const [schoolEndTime, setSchoolEndTime] = useState('17:00:00');
  const [lectureDurationMinutes, setLectureDurationMinutes] = useState(45);
  const [numberOfBreaks, setNumberOfBreaks] = useState(2);
  const [breakConfigurations, setBreakConfigurations] = useState<BreakConfiguration[]>([
    { afterLecture: 0, durationMinutes: 15, name: 'Morning Assembly' },
    { afterLecture: 4, durationMinutes: 45, name: 'Lunch Break' }
  ]);
  const [includeBreaks, setIncludeBreaks] = useState(true);
  const [generatedPeriods, setGeneratedPeriods] = useState<GeneratedPeriod[]>([]);
  const [generationResult, setGenerationResult] = useState<PeriodGenerationResult | null>(null);
  const [showWEFModal, setShowWEFModal] = useState(false);
  const [wefDate, setWefDate] = useState('');
  const [createNewVersion, setCreateNewVersion] = useState(false);
  const [requiresWEF, setRequiresWEF] = useState(false);

  useEffect(() => {
    if (config) {
      setSchoolStartTime(config.start_time);
      setSchoolEndTime(config.end_time);
      setLectureDurationMinutes(config.lecture_duration_minutes);
      // Initialize break configurations based on existing config
      if (config.break_duration_minutes) {
        setBreakConfigurations([
          { afterLecture: 0, durationMinutes: 15, name: 'Morning Assembly' },
          { afterLecture: 4, durationMinutes: 45, name: 'Lunch Break' }
        ]);
      }
    }
  }, [config]);

  // Update number of breaks when break configurations change
  useEffect(() => {
    setNumberOfBreaks(breakConfigurations.length);
  }, [breakConfigurations]);

  const addBreakConfiguration = () => {
    const newBreak: BreakConfiguration = {
      afterLecture: breakConfigurations.length + 1,
      durationMinutes: 15,
      name: `Break ${breakConfigurations.length + 1}`
    };
    setBreakConfigurations([...breakConfigurations, newBreak]);
  };

  const removeBreakConfiguration = (index: number) => {
    const newBreaks = breakConfigurations.filter((_, i) => i !== index);
    setBreakConfigurations(newBreaks);
  };

  const updateBreakConfiguration = (index: number, field: keyof BreakConfiguration, value: any) => {
    const newBreaks = [...breakConfigurations];

    // Handle numeric fields to prevent NaN
    if (field === 'afterLecture' || field === 'durationMinutes') {
      const numValue = parseInt(value);
      if (isNaN(numValue)) {
        return; // Don't update if value is NaN
      }

      if (field === 'afterLecture') {
        newBreaks[index] = { ...newBreaks[index], [field]: Math.max(0, Math.min(20, numValue)) };
      } else if (field === 'durationMinutes') {
        newBreaks[index] = { ...newBreaks[index], [field]: Math.max(5, Math.min(120, numValue)) };
      }
    } else {
      newBreaks[index] = { ...newBreaks[index], [field]: value };
    }

    setBreakConfigurations(newBreaks);
  };

  const handleNumberOfBreaksChange = (newNumber: number) => {
    // Ensure newNumber is a valid number
    const validNumber = isNaN(newNumber) ? 0 : Math.max(0, Math.min(10, newNumber));

    if (validNumber > breakConfigurations.length) {
      // Add new break configurations
      const newBreaks = [...breakConfigurations];
      for (let i = breakConfigurations.length; i < validNumber; i++) {
        newBreaks.push({
          afterLecture: i + 1,
          durationMinutes: 15,
          name: `Break ${i + 1}`
        });
      }
      setBreakConfigurations(newBreaks);
    } else if (validNumber < breakConfigurations.length) {
      // Remove excess break configurations
      setBreakConfigurations(breakConfigurations.slice(0, validNumber));
    }
    setNumberOfBreaks(validNumber);
  };

  const generatePeriods = async () => {
    try {
      setLoading(true);

      const generationConfig: PeriodGenerationConfig = {
        schoolStartTime,
        schoolEndTime,
        lectureDurationMinutes,
        numberOfBreaks: includeBreaks ? numberOfBreaks : 0,
        breakConfigurations: includeBreaks ? breakConfigurations : [],
        includeBreaks
      };

      const result = await timetableService.generatePeriodsFromConfig(generationConfig);
      setGeneratedPeriods(result.periods);
      setGenerationResult(result);

    } catch (err) {
      console.error('Failed to generate periods:', err);
      showError('Error', 'Failed to generate periods');
    } finally {
      setLoading(false);
    }
  };

  const validateConfiguration = (): string[] => {
    const errors: string[] = [];

    // Validate time range
    const startDate = new Date(`2000-01-01T${schoolStartTime}`);
    const endDate = new Date(`2000-01-01T${schoolEndTime}`);

    if (startDate >= endDate) {
      errors.push('School end time must be after start time');
    }

    // Check minimum duration
    const totalMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
    if (totalMinutes < lectureDurationMinutes) {
      errors.push('School day duration must be at least one lecture period');
    }

    // Validate lecture duration
    if (lectureDurationMinutes < 15 || lectureDurationMinutes > 180) {
      errors.push('Lecture duration must be between 15 and 180 minutes');
    }

    // Validate break configurations
    if (includeBreaks && breakConfigurations.length > 0) {
      breakConfigurations.forEach((breakConfig, index) => {
        if (breakConfig.afterLecture < 0) {
          errors.push(`Break ${index + 1}: Must be after lecture 0 (morning assembly) or later`);
        }
        if (breakConfig.durationMinutes < 5 || breakConfig.durationMinutes > 120) {
          errors.push(`Break ${index + 1}: Duration must be between 5 and 120 minutes`);
        }
      });

      // Check for duplicate break positions
      const positions = breakConfigurations.map(b => b.afterLecture);
      const duplicates = positions.filter((pos, index) => positions.indexOf(pos) !== index);
      if (duplicates.length > 0) {
        errors.push('Multiple breaks cannot be scheduled after the same lecture');
      }
    }

    // Check if timing changes require WEF date
    const hasTimingChanges = config && (
      schoolStartTime !== config.start_time ||
      schoolEndTime !== config.end_time ||
      lectureDurationMinutes !== config.lecture_duration_minutes
    );



    if (hasTimingChanges && version.is_active) {
      setRequiresWEF(true);
      if (!wefDate) {
        errors.push('Effective date (WEF) is required for timing changes');
      }
    } else {
      setRequiresWEF(false);
    }

    return errors;
  };

  const handleSave = async () => {
    const errors = validateConfiguration();
    if (errors.length > 0) {
      showError('Validation Error', `${errors.join(', ')}`);
      return;
    }

    if (generatedPeriods.length === 0) {
      showError('Error', 'Please generate periods before saving');
      return;
    }

    // If timing changes require WEF date, show WEF modal
    if (requiresWEF && version.is_active) {
      setShowWEFModal(true);
      return;
    }
    await saveConfiguration();
  };

  const saveConfiguration = async (newVersionId?: string) => {
    try {
      setLoading(true);
      
      // Update configuration
      // Calculate average break duration for legacy compatibility
      const avgBreakDuration = breakConfigurations.length > 0
        ? Math.round(breakConfigurations.reduce((sum, b) => sum + b.durationMinutes, 0) / breakConfigurations.length)
        : 15;

      await timetableService.updateTimetableConfig({
        start_time: schoolStartTime,
        end_time: schoolEndTime,
        lecture_duration_minutes: lectureDurationMinutes,
        break_duration_minutes: avgBreakDuration
      });

      // Update periods for the version
      const versionId = newVersionId || version.id;
      await timetableService.updatePeriodsForVersion(versionId, generatedPeriods);

      showSuccess('Success', 'Period configuration updated successfully');
      onConfigUpdated();

    } catch (err) {
      console.error('Failed to save configuration:', err);
      showError('Error', 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleWEFSave = async () => {
    if (!wefDate) {
      showError('Error', 'Please select an effective date');
      return;
    }

    try {
      setLoading(true);
      
      if (createNewVersion) {
        // Create new version with updated configuration
        const result = await timetableService.createTimetableVersion({
          versionName: `${version.version_name} - Updated Configuration`,
          description: `Updated period configuration effective from ${wefDate}`,
          effectiveFrom: wefDate,
          copyFromVersion: version.id,
          copySchedules: true
        });
        
        // Save configuration to new version
        await saveConfiguration(result.version.id);

        showSuccess(
          'Success',
          `New timetable version created with updated configuration (${result.version.version_number})`
        );

        // Refresh the parent component to show the new version
        onConfigUpdated();
      } else {
        // Update current version with new effective date
        await timetableService.activateTimetableVersion(version.id, wefDate);
        await saveConfiguration();
        
        showSuccess('Success', 'Configuration updated with new effective date');
      }
      
      setShowWEFModal(false);
      setWefDate('');
      setCreateNewVersion(false);
      
    } catch (err) {
      console.error('Failed to save with WEF date:', err);
      showError('Error', 'Failed to save configuration with effective date');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string): string => {
    if (!timeString || timeString.length < 5) {
      return '08:00'; // Default fallback
    }
    return timeString.slice(0, 5); // Remove seconds
  };

  const formatDuration = (minutes: number): string => {
    if (isNaN(minutes) || minutes < 0) {
      return '0m';
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content period-config-modal">
        <div className="modal-header">
          <h2>Period Configuration</h2>
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
          <div className="config-section">
            <h3>School Timing Configuration</h3>
            <div className="config-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="schoolStartTime">School Start Time</label>
                  <input
                    type="time"
                    id="schoolStartTime"
                    value={formatTime(schoolStartTime)}
                    onChange={(e) => setSchoolStartTime(e.target.value + ':00')}
                    disabled={loading}
                  />
                  <small className="form-help">
                    When the first lecture period begins each day
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="schoolEndTime">School End Time</label>
                  <input
                    type="time"
                    id="schoolEndTime"
                    value={formatTime(schoolEndTime)}
                    onChange={(e) => setSchoolEndTime(e.target.value + ':00')}
                    disabled={loading}
                  />
                  <small className="form-help">
                    When the last lecture period ends each day
                  </small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="lectureDuration">Lecture Duration (minutes)</label>
                  <input
                    type="number"
                    id="lectureDuration"
                    min="15"
                    max="180"
                    step="15"
                    value={lectureDurationMinutes}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value)) {
                        setLectureDurationMinutes(Math.max(15, Math.min(180, value)));
                      }
                    }}
                    disabled={loading}
                  />
                  <small className="form-help">
                    Length of each individual lecture period
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="numberOfBreaks">Number of Breaks</label>
                  <input
                    type="number"
                    id="numberOfBreaks"
                    min="0"
                    max="10"
                    value={numberOfBreaks}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value)) {
                        handleNumberOfBreaksChange(value);
                      }
                    }}
                    disabled={loading || !includeBreaks}
                  />
                  <small className="form-help">
                    Total number of breaks during the school day
                  </small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={includeBreaks}
                      onChange={(e) => setIncludeBreaks(e.target.checked)}
                      disabled={loading}
                    />
                    Enable break configuration
                  </label>
                  <small className="form-help">
                    Allow configuring specific breaks at designated positions
                  </small>
                </div>

                {requiresWEF && (
                  <div className="form-group">
                    <label htmlFor="wefDate">Effective From Date (Required)</label>
                    <input
                      type="date"
                      id="wefDate"
                      value={wefDate}
                      onChange={(e) => setWefDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      disabled={loading}
                      required
                    />
                    <small className="form-help">
                      Timing changes require an effective date
                    </small>
                  </div>
                )}
              </div>

              {/* Break Configuration Section */}
              {includeBreaks && numberOfBreaks > 0 && (
                <div className="break-config-section">
                  <h4>Break Configuration</h4>
                  <div className="break-configs">
                    {breakConfigurations.map((breakConfig, index) => (
                      <div key={index} className="break-config-item">
                        <div className="break-config-header">
                          <span className="break-number">Break {index + 1}</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => removeBreakConfiguration(index)}
                            disabled={loading}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>

                        <div className="break-config-form">
                          <div className="form-row">
                            <div className="form-group">
                              <label>Break Name</label>
                              <input
                                type="text"
                                value={breakConfig.name || ''}
                                onChange={(e) => updateBreakConfiguration(index, 'name', e.target.value)}
                                placeholder={`Break ${index + 1}`}
                                disabled={loading}
                              />
                            </div>

                            <div className="form-group">
                              <label>After Lecture #</label>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={breakConfig.afterLecture}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  if (!isNaN(value)) {
                                    updateBreakConfiguration(index, 'afterLecture', value);
                                  }
                                }}
                                disabled={loading}
                              />
                              <small className="form-help">
                                0 = Morning Assembly, 1+ = After lecture number (sequential)
                              </small>
                            </div>

                            <div className="form-group">
                              <label>Duration (minutes)</label>
                              <input
                                type="number"
                                min="5"
                                max="120"
                                step="5"
                                value={breakConfig.durationMinutes}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  if (!isNaN(value)) {
                                    updateBreakConfiguration(index, 'durationMinutes', value);
                                  }
                                }}
                                disabled={loading}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={addBreakConfiguration}
                    disabled={loading}
                  >
                    <i className="fas fa-plus"></i>
                    Add Break
                  </button>
                </div>
              )}

              <div className="form-actions">
                <button
                  className="btn btn-outline"
                  onClick={generatePeriods}
                  disabled={loading}
                >
                  <i className="fas fa-calculator"></i>
                  {loading ? 'Generating...' : 'Generate Periods'}
                </button>
              </div>
            </div>
          </div>

          {/* Generated Periods Preview */}
          {generationResult && (
            <div className="preview-section">
              <h3>Generated Periods Preview</h3>

              <div className="generation-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Periods:</span>
                  <span className="stat-value">{generationResult.totalPeriods}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Lecture Time:</span>
                  <span className="stat-value">{formatDuration(generationResult.totalDuration)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">School Day Duration:</span>
                  <span className="stat-value">{formatDuration(generationResult.schoolDayDuration)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Breaks:</span>
                  <span className="stat-value">{generationResult.totalBreaks || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Break Time:</span>
                  <span className="stat-value">{formatDuration(generationResult.totalBreakTime || 0)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Utilization:</span>
                  <span className="stat-value">{generationResult.utilizationPercentage}%</span>
                </div>
              </div>

              <div className="periods-timeline">
                {generatedPeriods
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((period, index) => (
                    <div
                      key={index}
                      className={`timeline-item ${period.isBreak ? 'break-period' : 'lecture-period'}`}
                    >
                      <div className="time-range">
                        {formatTime(period.startTime)} - {formatTime(period.endTime)}
                      </div>
                      <div className="period-info">
                        <strong>{period.periodName}</strong>
                        <span className="duration">
                          {formatDuration(
                            period.isBreak
                              ? period.breakDurationMinutes
                              : lectureDurationMinutes
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
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
            disabled={loading || generatedPeriods.length === 0}
          >
            {loading ? 'Saving...' : 'Save Configuration'}
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
                    You are making significant changes to the period configuration. This will affect all future schedules.
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
                    All schedules on or after this date will use the new period configuration
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
                        <li>Future schedules will use the new period configuration</li>
                        <li>Historical schedules remain unchanged</li>
                      </>
                    ) : (
                      <>
                        <li>Current version will be updated</li>
                        <li>All schedules will use new period configuration</li>
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

export default PeriodConfigurationModal;
