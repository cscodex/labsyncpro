import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { timetableService } from '../../services/timetableService';

// Define interfaces locally to avoid import issues
interface Period {
  id: string;
  period_number: number;
  period_name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  lecture_duration_minutes: number;
  number_of_lectures: number;
  is_break: boolean;
  break_duration_minutes: number;
  display_order: number;
  is_active: boolean;
}

interface TimetableVersion {
  id: string;
  version_number: string;
  version_name: string;
  description?: string;
  effective_from: string;
  effective_until?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  period_count?: number;
  schedule_count?: number;
  active_schedule_count?: number;
}

interface WeeklyClassSchedule {
  id: string;
  timetable_version_id: string;
  period_id: string;
  class_id?: string;
  subject_name: string;
  instructor_id?: string;
  instructor_name?: string;
  lab_id?: string;
  room_name?: string;
  day_of_week: number;
  start_date: string;
  end_date?: string;
  exclude_second_saturdays: boolean;
  exclude_sundays: boolean;
  custom_holiday_dates: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WeeklyClassScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: TimetableVersion;
  periods: Period[];
  onScheduleCreated: () => void;
  editingSchedule?: WeeklyClassSchedule | null;
}

interface FormData {
  subjectName: string;
  instructorName: string;
  roomName: string;
  classId: string;
  periodId: string;
  dayOfWeek: number;
  startDate: string;
  endDate: string;
  excludeSecondSaturdays: boolean;
  excludeSundays: boolean;
  customHolidayDates: string[];
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' }
];

const WeeklyClassScheduleModal: React.FC<WeeklyClassScheduleModalProps> = ({
  isOpen,
  onClose,
  version,
  periods,
  onScheduleCreated,
  editingSchedule
}) => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);

  const [formData, setFormData] = useState<FormData>({
    subjectName: '',
    instructorName: '',
    roomName: '',
    classId: '',
    periodId: '',
    dayOfWeek: 1,
    startDate: '2024-04-01',
    endDate: '2024-12-31',
    excludeSecondSaturdays: true,
    excludeSundays: true,
    customHolidayDates: []
  });

  const [newHolidayDate, setNewHolidayDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (editingSchedule) {
        setFormData({
          subjectName: editingSchedule.subject_name,
          instructorName: editingSchedule.instructor_name || '',
          roomName: editingSchedule.room_name || '',
          classId: editingSchedule.class_id || '',
          periodId: editingSchedule.period_id,
          dayOfWeek: editingSchedule.day_of_week,
          startDate: editingSchedule.start_date,
          endDate: editingSchedule.end_date || '2024-12-31',
          excludeSecondSaturdays: editingSchedule.exclude_second_saturdays,
          excludeSundays: editingSchedule.exclude_sundays,
          customHolidayDates: editingSchedule.custom_holiday_dates || []
        });
      } else {
        // Reset form for new schedule
        setFormData({
          subjectName: '',
          instructorName: '',
          roomName: '',
          classId: '',
          periodId: '',
          dayOfWeek: 1,
          startDate: '2024-04-01',
          endDate: '2024-12-31',
          excludeSecondSaturdays: true,
          excludeSundays: true,
          customHolidayDates: []
        });
      }
    }
  }, [isOpen, editingSchedule]);

  const loadData = async () => {
    try {
      // Load classes, instructors, and labs
      // These would be API calls in a real implementation
      setClasses([
        { id: '1', name: 'Computer Science A', code: 'CS-A' },
        { id: '2', name: 'Computer Science B', code: 'CS-B' },
        { id: '3', name: 'Information Technology A', code: 'IT-A' },
        { id: '4', name: 'Information Technology B', code: 'IT-B' }
      ]);

      setInstructors([
        { id: '1', name: 'Dr. John Smith' },
        { id: '2', name: 'Prof. Sarah Johnson' },
        { id: '3', name: 'Dr. Michael Brown' },
        { id: '4', name: 'Prof. Emily Davis' }
      ]);

      setLabs([
        { id: '1', name: 'Computer Lab 1', code: 'CL1' },
        { id: '2', name: 'Computer Lab 2', code: 'CL2' },
        { id: '3', name: 'Programming Lab', code: 'PL1' },
        { id: '4', name: 'Network Lab', code: 'NL1' }
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
      showError('Error', 'Failed to load required data');
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addHolidayDate = () => {
    if (newHolidayDate && !formData.customHolidayDates.includes(newHolidayDate)) {
      setFormData(prev => ({
        ...prev,
        customHolidayDates: [...prev.customHolidayDates, newHolidayDate].sort()
      }));
      setNewHolidayDate('');
    }
  };

  const removeHolidayDate = (dateToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      customHolidayDates: prev.customHolidayDates.filter(date => date !== dateToRemove)
    }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.subjectName.trim()) {
      errors.push('Subject name is required');
    }

    if (!formData.periodId) {
      errors.push('Period selection is required');
    }

    if (!formData.startDate) {
      errors.push('Start date is required');
    }

    if (!formData.endDate) {
      errors.push('End date is required');
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      errors.push('End date must be after start date');
    }

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      showError('Validation Error', errors.join(', '));
      return;
    }

    try {
      setLoading(true);

      const scheduleData = {
        timetable_version_id: version.id,
        period_id: formData.periodId,
        class_id: formData.classId || null,
        subject_name: formData.subjectName,
        instructor_name: formData.instructorName || null,
        room_name: formData.roomName || null,
        day_of_week: formData.dayOfWeek,
        start_date: formData.startDate,
        end_date: formData.endDate,
        exclude_second_saturdays: formData.excludeSecondSaturdays,
        exclude_sundays: formData.excludeSundays,
        custom_holiday_dates: formData.customHolidayDates
      };

      if (editingSchedule) {
        // Update existing schedule
        await timetableService.updateWeeklySchedule(editingSchedule.id, scheduleData);
        showSuccess('Success', 'Weekly schedule updated successfully');
      } else {
        // Create new schedule
        await timetableService.createWeeklySchedule(scheduleData);
        showSuccess('Success', 'Weekly schedule created successfully');
      }

      onScheduleCreated();
      onClose();
    } catch (error) {
      console.error('Failed to save weekly schedule:', error);
      showError('Error', 'Failed to save weekly schedule');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedPeriod = periods.find(p => p.id === formData.periodId);

  return (
    <div className="modal-overlay">
      <div className="modal weekly-schedule-modal">
        <div className="modal-header">
          <h2>
            <i className="fas fa-calendar-week"></i>
            {editingSchedule ? 'Edit Weekly Class Schedule' : 'Create Weekly Class Schedule'}
          </h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <div className="schedule-info">
            <div className="info-card">
              <h4>Schedule Information</h4>
              <p><strong>Version:</strong> {version.version_number} - {version.version_name}</p>
              <p><strong>Academic Year:</strong> Starting from April 1st, 2024</p>
              <p><strong>Holiday Policy:</strong> Second Saturdays and Sundays excluded by default</p>
            </div>
          </div>

          <div className="form-section">
            <h4>Basic Details</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Subject Name *</label>
                <input
                  type="text"
                  value={formData.subjectName}
                  onChange={(e) => handleInputChange('subjectName', e.target.value)}
                  placeholder="e.g., Data Structures, Programming Fundamentals"
                  required
                />
              </div>

              <div className="form-group">
                <label>Class</label>
                <select
                  value={formData.classId}
                  onChange={(e) => handleInputChange('classId', e.target.value)}
                >
                  <option value="">Select Class (Optional)</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Instructor Name</label>
                <input
                  type="text"
                  value={formData.instructorName}
                  onChange={(e) => handleInputChange('instructorName', e.target.value)}
                  placeholder="Enter instructor name"
                />
              </div>

              <div className="form-group">
                <label>Room/Lab</label>
                <input
                  type="text"
                  value={formData.roomName}
                  onChange={(e) => handleInputChange('roomName', e.target.value)}
                  placeholder="e.g., Computer Lab 1, Room 101"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Schedule Timing</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Day of Week *</label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => handleInputChange('dayOfWeek', parseInt(e.target.value))}
                  required
                >
                  {DAYS_OF_WEEK.map(day => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Time Period *</label>
                <select
                  value={formData.periodId}
                  onChange={(e) => handleInputChange('periodId', e.target.value)}
                  required
                >
                  <option value="">Select Period</option>
                  {periods.map(period => (
                    <option key={period.id} value={period.id}>
                      {period.period_name} ({timetableService.formatTime(period.start_time)} - {timetableService.formatTime(period.end_time)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedPeriod && (
              <div className="period-info">
                <div className="info-badge">
                  <i className="fas fa-clock"></i>
                  <span>
                    {selectedPeriod.period_name}: {timetableService.formatTime(selectedPeriod.start_time)} - {timetableService.formatTime(selectedPeriod.end_time)}
                    ({selectedPeriod.duration_minutes} minutes)
                  </span>
                </div>
                <div className="info-badge">
                  <i className="fas fa-chalkboard-teacher"></i>
                  <span>
                    {selectedPeriod.number_of_lectures} lecture(s) of {selectedPeriod.lecture_duration_minutes} minutes each
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <h4>Date Range</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  min="2024-04-01"
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  min={formData.startDate}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Holiday Settings</h4>
            <div className="holiday-options">
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.excludeSundays}
                    onChange={(e) => handleInputChange('excludeSundays', e.target.checked)}
                  />
                  Exclude all Sundays
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.excludeSecondSaturdays}
                    onChange={(e) => handleInputChange('excludeSecondSaturdays', e.target.checked)}
                  />
                  Exclude second Saturdays of each month
                </label>
              </div>
            </div>

            <div className="custom-holidays">
              <h5>Custom Holiday Dates</h5>
              <div className="add-holiday">
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  placeholder="Select holiday date"
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={addHolidayDate}
                  disabled={!newHolidayDate}
                >
                  <i className="fas fa-plus"></i>
                  Add Holiday
                </button>
              </div>

              {formData.customHolidayDates.length > 0 && (
                <div className="holiday-list">
                  {formData.customHolidayDates.map(date => (
                    <div key={date} className="holiday-item">
                      <span>{new Date(date).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => removeHolidayDate(date)}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="schedule-preview">
            <h4>Schedule Preview</h4>
            <div className="preview-info">
              <div className="preview-item">
                <strong>Subject:</strong> {formData.subjectName || 'Not specified'}
              </div>
              <div className="preview-item">
                <strong>Day:</strong> {DAYS_OF_WEEK.find(d => d.value === formData.dayOfWeek)?.label}
              </div>
              <div className="preview-item">
                <strong>Time:</strong> {selectedPeriod ?
                  `${timetableService.formatTime(selectedPeriod.start_time)} - ${timetableService.formatTime(selectedPeriod.end_time)}` :
                  'No period selected'
                }
              </div>
              <div className="preview-item">
                <strong>Duration:</strong> {formData.startDate} to {formData.endDate}
              </div>
              <div className="preview-item">
                <strong>Holidays:</strong>
                {formData.excludeSundays && ' Sundays'}
                {formData.excludeSecondSaturdays && ' Second Saturdays'}
                {formData.customHolidayDates.length > 0 && ` +${formData.customHolidayDates.length} custom dates`}
              </div>
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
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyClassScheduleModal;
