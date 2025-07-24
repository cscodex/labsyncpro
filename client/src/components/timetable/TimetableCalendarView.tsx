import React, { useState, useEffect } from 'react';
import { timetableService } from '../../services/timetableService';
import type { TimetableSchedule, Period } from '../../types/timetable';

interface TimetableCalendarViewProps {
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

const TimetableCalendarView: React.FC<TimetableCalendarViewProps> = ({
  schedules,
  periods,
  onCreateSchedule,
  onEditSchedule,
  onDeleteSchedule,
  userRole,
  selectedDate,
  onDateChange
}) => {
  const [calendarDates, setCalendarDates] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useEffect(() => {
    generateCalendarDates();
  }, [currentMonth]);

  const generateCalendarDates = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the Sunday before the first day
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    // End on the Saturday after the last day
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const dates = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    setCalendarDates(dates);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateChange(today);
  };

  const getSchedulesForDate = (date: Date): TimetableSchedule[] => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter(schedule => schedule.schedule_date === dateStr);
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const isSelectedDate = (date: Date): boolean => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const handleDateClick = (date: Date) => {
    onDateChange(date);
  };

  const handleScheduleClick = (schedule: TimetableSchedule, e: React.MouseEvent) => {
    e.stopPropagation();
    onEditSchedule(schedule);
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getDayNames = (): string[] => {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  };

  return (
    <div className="timetable-calendar-view">
      {/* Month Navigation */}
      <div className="month-navigation">
        <div className="nav-controls">
          <button
            className="btn btn-outline"
            onClick={() => navigateMonth('prev')}
          >
            <i className="fas fa-chevron-left"></i>
            Previous
          </button>
          
          <button
            className="btn btn-primary"
            onClick={goToToday}
          >
            Today
          </button>
          
          <button
            className="btn btn-outline"
            onClick={() => navigateMonth('next')}
          >
            Next
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
        
        <div className="month-info">
          <h3>{formatMonthYear(currentMonth)}</h3>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Day Headers */}
        <div className="calendar-header">
          {getDayNames().map(day => (
            <div key={day} className="day-header">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Dates */}
        <div className="calendar-body">
          {calendarDates.map((date, index) => {
            const daySchedules = getSchedulesForDate(date);
            const canEdit = userRole === 'admin' || userRole === 'instructor';
            
            return (
              <div
                key={index}
                className={`calendar-date ${isToday(date) ? 'today' : ''} ${
                  isCurrentMonth(date) ? 'current-month' : 'other-month'
                } ${isSelectedDate(date) ? 'selected' : ''} ${
                  canEdit ? 'clickable' : ''
                }`}
                onClick={() => handleDateClick(date)}
              >
                <div className="date-number">{date.getDate()}</div>
                
                <div className="date-schedules">
                  {daySchedules.slice(0, 3).map(schedule => (
                    <div
                      key={schedule.id}
                      className="schedule-item"
                      style={{
                        backgroundColor: schedule.color_code,
                        borderLeft: `3px solid ${schedule.color_code}`
                      }}
                      onClick={(e) => handleScheduleClick(schedule, e)}
                      title={`${schedule.session_title} - ${schedule.period_name}`}
                    >
                      <div className="schedule-time">
                        {timetableService.formatTime(schedule.start_time)}
                      </div>
                      <div className="schedule-title">{schedule.session_title}</div>
                      {schedule.lab_name && (
                        <div className="schedule-lab">{schedule.lab_name}</div>
                      )}
                    </div>
                  ))}
                  
                  {daySchedules.length > 3 && (
                    <div className="more-schedules">
                      +{daySchedules.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="selected-date-details">
          <h4>
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h4>
          
          <div className="date-schedules-list">
            {getSchedulesForDate(selectedDate).length === 0 ? (
              <div className="no-schedules">
                <p>No sessions scheduled for this date</p>
                {(userRole === 'admin' || userRole === 'instructor') && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      if (periods.length > 0) {
                        onCreateSchedule({
                          date: selectedDate.toISOString().split('T')[0],
                          periodId: periods[0].id,
                          periodName: periods[0].period_name,
                          startTime: periods[0].start_time,
                          endTime: periods[0].end_time
                        });
                      }
                    }}
                  >
                    <i className="fas fa-plus"></i>
                    Add Session
                  </button>
                )}
              </div>
            ) : (
              <div className="schedules-list">
                {getSchedulesForDate(selectedDate)
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map(schedule => (
                    <div
                      key={schedule.id}
                      className="schedule-detail-item"
                      style={{ borderLeft: `4px solid ${schedule.color_code}` }}
                    >
                      <div className="schedule-header">
                        <div className="schedule-time">
                          {timetableService.formatTime(schedule.start_time)} - 
                          {timetableService.formatTime(schedule.end_time)}
                        </div>
                        <div className="schedule-period">{schedule.period_name}</div>
                      </div>
                      
                      <div className="schedule-content">
                        <h5>{schedule.session_title}</h5>
                        <div className="schedule-meta">
                          <span className="session-type">{schedule.session_type}</span>
                          {schedule.lab_name && (
                            <span className="lab-name">{schedule.lab_name}</span>
                          )}
                          {schedule.instructor_name && (
                            <span className="instructor-name">{schedule.instructor_name}</span>
                          )}
                          {schedule.class_name && (
                            <span className="class-name">{schedule.class_name}</span>
                          )}
                        </div>
                        
                        {schedule.session_description && (
                          <p className="schedule-description">{schedule.session_description}</p>
                        )}
                        
                        <div className={`status-badge status-${schedule.status}`}>
                          {schedule.status}
                        </div>
                      </div>
                      
                      {(userRole === 'admin' || userRole === 'instructor') && (
                        <div className="schedule-actions">
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => onEditSchedule(schedule)}
                          >
                            <i className="fas fa-edit"></i>
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this schedule?')) {
                                onDeleteSchedule(schedule.id);
                              }
                            }}
                          >
                            <i className="fas fa-trash"></i>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Month Summary */}
      <div className="month-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-number">{schedules.length}</span>
            <span className="stat-label">Total Sessions</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {calendarDates.filter(date => 
                isCurrentMonth(date) && getSchedulesForDate(date).length > 0
              ).length}
            </span>
            <span className="stat-label">Active Days</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {new Set(schedules.map(s => s.lab_name).filter(Boolean)).size}
            </span>
            <span className="stat-label">Labs Used</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {new Set(schedules.map(s => s.instructor_name).filter(Boolean)).size}
            </span>
            <span className="stat-label">Instructors</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableCalendarView;
