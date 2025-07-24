import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { timetableService } from '../../services/timetableService';
import type { TimetableSchedule, Period } from '../../types/timetable';
import api from '../../services/api';

interface ScheduleModalProps {
  schedule: TimetableSchedule | null;
  timeSlot: {
    date: string;
    periodId: string;
    periodName: string;
    startTime: string;
    endTime: string;
  } | null;
  periods: Period[];
  activeVersion: any; // TimetableVersion
  onSave: () => void;
  onClose: () => void;
}

interface FormData {
  sessionTitle: string;
  sessionType: string;
  sessionDescription: string;
  scheduleDate: string;
  periodId: string;
  labId: string;
  roomName: string;
  instructorId: string;
  instructorName: string;
  classId: string;
  groupId: string;
  studentCount: number;
  maxCapacity: number;
  colorCode: string;
  notes: string;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
  schedule,
  timeSlot,
  periods,
  activeVersion,
  onSave,
  onClose
}) => {
  const { showSuccess, showError, showWarning } = useNotification();
  
  const [formData, setFormData] = useState<FormData>({
    sessionTitle: '',
    sessionType: 'lecture',
    sessionDescription: '',
    scheduleDate: '',
    periodId: '',
    labId: '',
    roomName: '',
    instructorId: '',
    instructorName: '',
    classId: '',
    groupId: '',
    studentCount: 0,
    maxCapacity: 0,
    colorCode: '#3B82F6',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [labs, setLabs] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    loadFormData();
    loadDropdownData();
  }, [schedule, timeSlot]);

  const loadFormData = () => {
    if (schedule) {
      // Edit mode
      setFormData({
        sessionTitle: schedule.session_title,
        sessionType: schedule.session_type,
        sessionDescription: schedule.session_description || '',
        scheduleDate: schedule.schedule_date,
        periodId: periods.find(p => p.period_number === schedule.period_number)?.id || '',
        labId: '', // Will be set from lab name
        roomName: schedule.lab_name || '',
        instructorId: '', // Will be set from instructor name
        instructorName: schedule.instructor_name || '',
        classId: '', // Will be set from class name
        groupId: '', // Will be set from group name
        studentCount: schedule.student_count,
        maxCapacity: schedule.max_capacity || 0,
        colorCode: schedule.color_code,
        notes: schedule.notes || ''
      });
    } else if (timeSlot) {
      // Create mode
      setFormData(prev => ({
        ...prev,
        scheduleDate: timeSlot.date,
        periodId: timeSlot.periodId,
        colorCode: timetableService.getSessionTypeColor('lecture')
      }));
    }
  };

  const loadDropdownData = async () => {
    try {
      const [labsResponse, instructorsResponse, classesResponse] = await Promise.all([
        api.get('/labs'),
        api.get('/users?role=instructor'),
        api.get('/classes')
      ]);

      setLabs(labsResponse.data.labs || []);
      setInstructors(instructorsResponse.data.users || []);
      setClasses(classesResponse.data.classes || []);
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sessionTitle.trim()) {
      showError('Validation Error', 'Session title is required');
      return;
    }

    try {
      setLoading(true);

      const submitData = {
        sessionTitle: formData.sessionTitle,
        sessionType: formData.sessionType,
        sessionDescription: formData.sessionDescription,
        scheduleDate: formData.scheduleDate,
        periodId: formData.periodId,
        versionId: activeVersion?.id || '1', // Include the required versionId
        labId: formData.labId || undefined,
        roomName: formData.roomName || undefined,
        instructorId: formData.instructorId || undefined,
        instructorName: formData.instructorName || undefined,
        classId: formData.classId || undefined,
        groupId: formData.groupId || undefined,
        studentCount: formData.studentCount,
        maxCapacity: formData.maxCapacity || undefined,
        colorCode: formData.colorCode,
        notes: formData.notes
      };

      if (schedule) {
        // Update existing schedule
        await timetableService.updateSchedule(schedule.id, submitData);
        showSuccess('Success', 'Schedule updated successfully');
      } else {
        // Create new schedule
        const result = await timetableService.createSchedule(submitData);

        if (result.conflicts && result.conflicts.length > 0) {
          showWarning(
            'Warning',
            `Schedule created with ${result.conflicts.length} conflict(s) detected`
          );
        } else {
          showSuccess('Success', 'Schedule created successfully');
        }
      }

      onSave();
    } catch (err) {
      console.error('Failed to save schedule:', err);
      showError('Error', 'Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Update color when session type changes
    if (field === 'sessionType') {
      setFormData(prev => ({
        ...prev,
        colorCode: timetableService.getSessionTypeColor(value)
      }));
    }
  };

  const selectedPeriod = periods.find(p => p.id === formData.periodId);

  return (
    <div className="modal-overlay">
      <div className="modal-content schedule-modal">
        <div className="modal-header">
          <h3>{schedule ? 'Edit Schedule' : 'Create New Schedule'}</h3>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Basic Information */}
          <div className="form-section">
            <h4>Session Information</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="sessionTitle">Session Title *</label>
                <input
                  type="text"
                  id="sessionTitle"
                  value={formData.sessionTitle}
                  onChange={(e) => handleInputChange('sessionTitle', e.target.value)}
                  placeholder="e.g., Python Programming Lab"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="sessionType">Session Type</label>
                <select
                  id="sessionType"
                  value={formData.sessionType}
                  onChange={(e) => handleInputChange('sessionType', e.target.value)}
                >
                  <option value="lecture">Lecture</option>
                  <option value="lab">Lab</option>
                  <option value="test">Test</option>
                  <option value="practical">Practical</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="sessionDescription">Description</label>
              <textarea
                id="sessionDescription"
                value={formData.sessionDescription}
                onChange={(e) => handleInputChange('sessionDescription', e.target.value)}
                placeholder="Optional session description"
                rows={3}
              />
            </div>
          </div>

          {/* Schedule Details */}
          <div className="form-section">
            <h4>Schedule Details</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="scheduleDate">Date</label>
                {timeSlot ? (
                  <div className="readonly-field">
                    <input
                      type="text"
                      value={new Date(timeSlot.date).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      readOnly
                      className="readonly-input"
                    />
                    <i className="fas fa-calendar-alt"></i>
                  </div>
                ) : (
                  <input
                    type="date"
                    id="scheduleDate"
                    value={formData.scheduleDate}
                    onChange={(e) => handleInputChange('scheduleDate', e.target.value)}
                    required
                  />
                )}
              </div>

              <div className="form-group">
                <label htmlFor="periodId">Time Period</label>
                {timeSlot ? (
                  <div className="readonly-field">
                    <input
                      type="text"
                      value={`${timeSlot.periodName} (${timeSlot.startTime} - ${timeSlot.endTime})`}
                      readOnly
                      className="readonly-input"
                    />
                    <i className="fas fa-clock"></i>
                  </div>
                ) : (
                  <select
                    id="periodId"
                    value={formData.periodId}
                    onChange={(e) => handleInputChange('periodId', e.target.value)}
                    required
                  >
                    <option value="">Select Period</option>
                    {periods
                      .filter(p => !p.is_break)
                      .sort((a, b) => a.display_order - b.display_order)
                      .map(period => (
                        <option key={period.id} value={period.id}>
                          {period.period_name} ({timetableService.formatTime(period.start_time)} - {timetableService.formatTime(period.end_time)})
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>

            {selectedPeriod && (
              <div className="time-display">
                <i className="fas fa-clock"></i>
                <span>
                  {timetableService.formatTime(selectedPeriod.start_time)} - 
                  {timetableService.formatTime(selectedPeriod.end_time)}
                  ({selectedPeriod.duration_minutes} minutes)
                </span>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="form-section">
            <h4>Location</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="labId">Laboratory</label>
                <select
                  id="labId"
                  value={formData.labId}
                  onChange={(e) => handleInputChange('labId', e.target.value)}
                >
                  <option value="">Select Lab</option>
                  {labs.map(lab => (
                    <option key={lab.id} value={lab.id}>
                      {lab.name} (Capacity: {lab.total_seats})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="roomName">Or Room Name</label>
                <input
                  type="text"
                  id="roomName"
                  value={formData.roomName}
                  onChange={(e) => handleInputChange('roomName', e.target.value)}
                  placeholder="e.g., Classroom 101"
                />
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="form-section">
            <h4>Assignment</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="instructorId">Instructor</label>
                <select
                  id="instructorId"
                  value={formData.instructorId}
                  onChange={(e) => handleInputChange('instructorId', e.target.value)}
                >
                  <option value="">Select Instructor</option>
                  {instructors.map(instructor => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.first_name} {instructor.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="classId">Class</label>
                <select
                  id="classId"
                  value={formData.classId}
                  onChange={(e) => handleInputChange('classId', e.target.value)}
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="studentCount">Student Count</label>
                <input
                  type="number"
                  id="studentCount"
                  value={formData.studentCount}
                  onChange={(e) => handleInputChange('studentCount', parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxCapacity">Max Capacity</label>
                <input
                  type="number"
                  id="maxCapacity"
                  value={formData.maxCapacity}
                  onChange={(e) => handleInputChange('maxCapacity', parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="form-section">
            <h4>Appearance</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="colorCode">Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    id="colorCode"
                    value={formData.colorCode}
                    onChange={(e) => handleInputChange('colorCode', e.target.value)}
                  />
                  <input
                    type="text"
                    value={formData.colorCode}
                    onChange={(e) => handleInputChange('colorCode', e.target.value)}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes or instructions"
                rows={3}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="form-section">
            <h4>Preview</h4>
            <div 
              className="schedule-preview"
              style={{
                backgroundColor: formData.colorCode + '20',
                borderLeft: `4px solid ${formData.colorCode}`
              }}
            >
              <div className="preview-title">{formData.sessionTitle || 'Session Title'}</div>
              <div className="preview-type">{formData.sessionType}</div>
              {selectedPeriod && (
                <div className="preview-time">
                  {timetableService.formatTime(selectedPeriod.start_time)} - 
                  {timetableService.formatTime(selectedPeriod.end_time)}
                </div>
              )}
              {(formData.labId || formData.roomName) && (
                <div className="preview-location">
                  {labs.find(l => l.id === formData.labId)?.name || formData.roomName}
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : (schedule ? 'Update Schedule' : 'Create Schedule')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
