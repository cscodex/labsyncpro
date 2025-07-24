import React, { useState, useEffect } from 'react';
import { timetableService } from '../../services/timetableService';
import type { TimetableSchedule, Period } from '../../types/timetable';

interface TimetableWeeklyViewProps {
  schedules: TimetableSchedule[];
  periods: Period[];
  onCreateSchedule: (timeSlot: {
    date: string;
    periodId: string;
    periodName: string;
    startTime: string;
    endTime: string;
  }) => void;
  onEditSchedule: (schedule: TimetableSchedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  userRole: string;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const TimetableWeeklyView: React.FC<TimetableWeeklyViewProps> = ({
  schedules,
  periods,
  onCreateSchedule,
  onEditSchedule,
  onDeleteSchedule,
  userRole,
  selectedDate,
  onDateChange
}) => {
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(new Date());

  useEffect(() => {
    // Calculate week start (Sunday)
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - selectedDate.getDay());
    setWeekStart(start);

    // Generate week dates
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    setWeekDates(dates);
  }, [selectedDate]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const getScheduleForSlot = (date: string, periodId: string): TimetableSchedule | null => {
    return schedules.find(schedule => 
      schedule.schedule_date === date && 
      periods.find(p => p.id === periodId)?.period_number === schedule.period_number
    ) || null;
  };

  const handleCellClick = (date: string, period: Period) => {
    const existingSchedule = getScheduleForSlot(date, period.id);
    
    if (existingSchedule) {
      onEditSchedule(existingSchedule);
    } else if (userRole === 'admin' || userRole === 'instructor') {
      onCreateSchedule({
        date,
        periodId: period.id,
        periodName: period.period_name,
        startTime: period.start_time,
        endTime: period.end_time
      });
    }
  };

  const getDayName = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isToday = (dateStr: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const isPastDate = (dateStr: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  return (
    <div className="timetable-weekly-view">
      {/* Week Navigation */}
      <div className="week-navigation">
        <div className="nav-controls">
          <button
            className="btn btn-outline"
            onClick={() => navigateWeek('prev')}
          >
            <i className="fas fa-chevron-left"></i>
            Previous Week
          </button>
          
          <button
            className="btn btn-primary"
            onClick={goToToday}
          >
            Today
          </button>
          
          <button
            className="btn btn-outline"
            onClick={() => navigateWeek('next')}
          >
            Next Week
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
        
        <div className="week-info">
          <h3>
            Week of {weekStart.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </h3>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="timetable-grid">
        <div className="grid-container">
          {/* Header Row */}
          <div className="grid-header">
            <div className="time-header">Time</div>
            {weekDates.map(date => (
              <div
                key={date}
                className={`day-header ${isToday(date) ? 'today' : ''} ${isPastDate(date) ? 'past' : ''}`}
              >
                <div className="day-name">{getDayName(date)}</div>
                <div className="day-date">{getDateDisplay(date)}</div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          {periods
            .filter(period => !period.is_break)
            .sort((a, b) => a.display_order - b.display_order)
            .map(period => (
              <div key={period.id} className="time-row">
                {/* Time Column */}
                <div className="time-cell">
                  <div className="period-name">{period.period_name}</div>
                  <div className="time-range">
                    {timetableService.formatTime(period.start_time)} - 
                    {timetableService.formatTime(period.end_time)}
                  </div>
                </div>

                {/* Schedule Cells */}
                {weekDates.map(date => {
                  const schedule = getScheduleForSlot(date, period.id);
                  const canEdit = userRole === 'admin' || userRole === 'instructor';
                  
                  return (
                    <div
                      key={`${date}-${period.id}`}
                      className={`schedule-cell ${schedule ? 'has-schedule' : 'empty'} ${canEdit ? 'clickable' : ''} ${isPastDate(date) ? 'past' : ''}`}
                      onClick={() => canEdit && handleCellClick(date, period)}
                      style={{
                        backgroundColor: schedule ? schedule.color_code + '20' : undefined,
                        borderLeft: schedule ? `4px solid ${schedule.color_code}` : undefined
                      }}
                    >
                      {schedule ? (
                        <div className="schedule-content">
                          <div className="session-title">{schedule.session_title}</div>
                          <div className="session-details">
                            <span className="session-type">{schedule.session_type}</span>
                            {schedule.lab_name && (
                              <span className="lab-name">{schedule.lab_name}</span>
                            )}
                          </div>
                          {schedule.instructor_name && (
                            <div className="instructor-name">{schedule.instructor_name}</div>
                          )}
                          {schedule.class_name && (
                            <div className="class-name">{schedule.class_name}</div>
                          )}
                          
                          {/* Status Badge */}
                          <div className={`status-badge status-${schedule.status}`}>
                            {schedule.status}
                          </div>

                          {/* Action Buttons */}
                          {canEdit && (
                            <div className="schedule-actions">
                              <button
                                className="action-btn edit-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditSchedule(schedule);
                                }}
                                title="Edit Schedule"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="action-btn delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Are you sure you want to delete this schedule?')) {
                                    onDeleteSchedule(schedule.id);
                                  }
                                }}
                                title="Delete Schedule"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        canEdit && (
                          <div className="empty-cell-content">
                            <i className="fas fa-plus"></i>
                            <span>Add Session</span>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
      </div>

      {/* Legend */}
      <div className="timetable-legend">
        <h4>Session Types</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: timetableService.getSessionTypeColor('lecture') }}></div>
            <span>Lecture</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: timetableService.getSessionTypeColor('lab') }}></div>
            <span>Lab</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: timetableService.getSessionTypeColor('test') }}></div>
            <span>Test</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: timetableService.getSessionTypeColor('practical') }}></div>
            <span>Practical</span>
          </div>
        </div>
        
        <h4>Status</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="status-badge status-scheduled">scheduled</div>
          </div>
          <div className="legend-item">
            <div className="status-badge status-completed">completed</div>
          </div>
          <div className="legend-item">
            <div className="status-badge status-cancelled">cancelled</div>
          </div>
          <div className="legend-item">
            <div className="status-badge status-rescheduled">rescheduled</div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="week-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-number">{schedules.length}</span>
            <span className="stat-label">Total Sessions</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {schedules.filter(s => s.status === 'scheduled').length}
            </span>
            <span className="stat-label">Scheduled</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {schedules.filter(s => s.status === 'completed').length}
            </span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {new Set(schedules.map(s => s.lab_name).filter(Boolean)).size}
            </span>
            <span className="stat-label">Labs Used</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableWeeklyView;
