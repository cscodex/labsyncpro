import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { timetableService } from '../../services/timetableService';
import type { TimetableVersion, TimetableSchedule, Period, TimetableConfig } from '../../types/timetable';
import TimetableVersionManager from './TimetableVersionManager';
import PeriodTimeManager from './PeriodTimeManager';
import PeriodConfigurationModal from './PeriodConfigurationModal';
import TimetableCalendarView from './TimetableCalendarView';
import TimetableWeeklyView from './TimetableWeeklyView';
import ScheduleModal from './ScheduleModal';
import WeeklyClassScheduleModal from './WeeklyClassScheduleModal';
import TimetableExport from './TimetableExport';
import LoadingSpinner from '../common/LoadingSpinner';
import './ComprehensiveTimetable.css';

interface ComprehensiveTimetableProps {
  userRole: string;
  userId: string;
}

const ComprehensiveTimetable: React.FC<ComprehensiveTimetableProps> = ({ userRole, userId }) => {
  const { showSuccess, showError, showWarning } = useNotification();
  
  // State management
  const [activeVersion, setActiveVersion] = useState<TimetableVersion | null>(null);
  const [allVersions, setAllVersions] = useState<TimetableVersion[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [schedules, setSchedules] = useState<TimetableSchedule[]>([]);
  const [timetableConfig, setTimetableConfig] = useState<TimetableConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // View state
  const [currentView, setCurrentView] = useState<'weekly' | 'monthly' | 'calendar'>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showVersionManager, setShowVersionManager] = useState(false);
  const [showPeriodManager, setShowPeriodManager] = useState(false);
  const [showPeriodConfigModal, setShowPeriodConfigModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showWeeklyScheduleModal, setShowWeeklyScheduleModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<TimetableSchedule | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    date: string;
    periodId: string;
    periodName: string;
    startTime: string;
    endTime: string;
  } | null>(null);

  // Load initial data
  useEffect(() => {
    loadTimetableData();
  }, []);

  const loadTimetableData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load active version
      const activeVer = await timetableService.getActiveTimetableVersion();
      setActiveVersion(activeVer);

      // Load all versions
      const versions = await timetableService.getTimetableVersions();
      setAllVersions(versions);

      // Load periods for active version
      if (activeVer) {
        const periodsData = await timetableService.getPeriodsForVersion(activeVer.id);
        setPeriods(periodsData);
      }

      // Load timetable configuration
      const config = await timetableService.getTimetableConfig();
      setTimetableConfig(config);

      // Load current week schedules
      await loadSchedulesForCurrentView();

    } catch (err) {
      console.error('Failed to load timetable data:', err);
      setError('Failed to load timetable data');
      showError('Error', 'Failed to load timetable data');
    } finally {
      setLoading(false);
    }
  };

  const loadSchedulesForCurrentView = async () => {
    try {
      if (currentView === 'weekly') {
        const weekData = await timetableService.getCurrentWeekTimetable();
        setSchedules(weekData.schedules);
      } else {
        // For monthly/calendar view, load month's data
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        
        const schedulesData = await timetableService.getTimetableSchedules({
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: endOfMonth.toISOString().split('T')[0]
        });
        setSchedules(schedulesData);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
      showError('Error', 'Failed to load schedules');
    }
  };

  // Event handlers
  const handleVersionChange = async (versionId: string) => {
    try {
      const version = allVersions.find(v => v.id === versionId);
      if (version) {
        setActiveVersion(version);
        const periodsData = await timetableService.getPeriodsForVersion(versionId);
        setPeriods(periodsData);
        await loadSchedulesForCurrentView();
        showSuccess('Success', `Switched to ${version.version_name}`);
      }
    } catch (err) {
      console.error('Failed to switch version:', err);
      showError('Error', 'Failed to switch timetable version');
    }
  };

  const handleCreateSchedule = (timeSlot: {
    date: string;
    periodId: string;
    periodName: string;
    startTime: string;
    endTime: string;
  }) => {
    setSelectedTimeSlot(timeSlot);
    setSelectedSchedule(null);
    setShowScheduleModal(true);
  };

  const handleEditSchedule = (schedule: TimetableSchedule) => {
    setSelectedSchedule(schedule);
    setSelectedTimeSlot(null);
    setShowScheduleModal(true);
  };

  const handleScheduleSaved = async () => {
    setShowScheduleModal(false);
    setSelectedSchedule(null);
    setSelectedTimeSlot(null);
    await loadSchedulesForCurrentView();
    showSuccess('Success', 'Schedule saved successfully');
  };

  const handleScheduleDeleted = async (scheduleId: string) => {
    try {
      await timetableService.deleteSchedule(scheduleId);
      await loadSchedulesForCurrentView();
      showSuccess('Success', 'Schedule deleted successfully');
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      showError('Error', 'Failed to delete schedule');
    }
  };

  const handlePeriodsUpdated = async () => {
    if (activeVersion) {
      const periodsData = await timetableService.getPeriodsForVersion(activeVersion.id);
      setPeriods(periodsData);
      await loadSchedulesForCurrentView();
    }
    setShowPeriodManager(false);
    showSuccess('Success', 'Periods updated successfully');
  };

  const handleVersionCreated = async () => {
    await loadTimetableData();
    setShowVersionManager(false);
    showSuccess('Success', 'New timetable version created successfully');
  };

  const handleConfigUpdated = async () => {
    await loadTimetableData();
    setShowPeriodConfigModal(false);
    showSuccess('Success', 'Period configuration updated successfully');
  };

  // Get effective version for a specific date
  const getEffectiveVersionForDate = (date: string) => {
    const targetDate = new Date(date);

    // Find the version that should be active on the target date
    const effectiveVersion = allVersions
      .filter(v => new Date(v.effective_from) <= targetDate)
      .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime())[0];

    return effectiveVersion || activeVersion;
  };

  // Render loading state
  if (loading) {
    return (
      <LoadingSpinner
        size="large"
        message="Loading timetable..."
      />
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="comprehensive-timetable error">
        <div className="error-message">
          <h3>Error Loading Timetable</h3>
          <p>{error}</p>
          <button onClick={loadTimetableData} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="comprehensive-timetable">
      {/* Header */}
      <div className="timetable-header">
        <div className="header-left">
          <h1>Comprehensive Timetable System</h1>
          {activeVersion && (
            <div className="version-info">
              <span className="version-badge">
                {activeVersion.version_number} - {activeVersion.version_name}
              </span>
              <span className="effective-date">
                Effective from: {timetableService.formatDate(activeVersion.effective_from)}
              </span>
            </div>
          )}
        </div>
        
        <div className="header-actions">
          {/* View Toggle */}
          <div className="view-toggle">
            <button
              className={`btn ${currentView === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCurrentView('weekly')}
            >
              Weekly
            </button>
            <button
              className={`btn ${currentView === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCurrentView('calendar')}
            >
              Calendar
            </button>
          </div>

          {/* Admin Actions */}
          {(userRole === 'admin' || userRole === 'instructor') && (
            <div className="admin-actions">
              <button
                className="btn btn-outline"
                onClick={() => setShowPeriodConfigModal(true)}
                title="Configure Period Settings"
              >
                <i className="fas fa-cog"></i>
                Period Config
              </button>

              <button
                className="btn btn-outline"
                onClick={() => setShowPeriodManager(true)}
                title="Manage Period Times"
              >
                <i className="fas fa-clock"></i>
                Periods
              </button>

              <button
                className="btn btn-outline"
                onClick={() => setShowWeeklyScheduleModal(true)}
                title="Create Weekly Class Schedule"
              >
                <i className="fas fa-calendar-week"></i>
                Weekly Classes
              </button>

              {userRole === 'admin' && (
                <button
                  className="btn btn-outline"
                  onClick={() => setShowVersionManager(true)}
                  title="Manage Timetable Versions"
                >
                  <i className="fas fa-code-branch"></i>
                  Versions
                </button>
              )}

              <TimetableExport
                schedules={schedules}
                periods={periods}
                activeVersion={activeVersion}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="timetable-content">
        {currentView === 'weekly' && (
          <TimetableWeeklyView
            schedules={schedules}
            periods={periods}
            onCreateSchedule={handleCreateSchedule}
            onEditSchedule={handleEditSchedule}
            onDeleteSchedule={handleScheduleDeleted}
            userRole={userRole}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        )}
        
        {currentView === 'calendar' && (
          <TimetableCalendarView
            schedules={schedules}
            periods={periods}
            onCreateSchedule={handleCreateSchedule}
            onEditSchedule={handleEditSchedule}
            onDeleteSchedule={handleScheduleDeleted}
            userRole={userRole}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        )}
      </div>

      {/* Modals */}
      {showVersionManager && (
        <TimetableVersionManager
          versions={allVersions}
          activeVersion={activeVersion}
          onVersionChange={handleVersionChange}
          onVersionCreated={handleVersionCreated}
          onClose={() => setShowVersionManager(false)}
        />
      )}

      {showPeriodConfigModal && activeVersion && (
        <PeriodConfigurationModal
          version={activeVersion}
          config={timetableConfig}
          onConfigUpdated={handleConfigUpdated}
          onClose={() => setShowPeriodConfigModal(false)}
        />
      )}

      {showPeriodManager && activeVersion && (
        <PeriodTimeManager
          version={activeVersion}
          periods={periods}
          onPeriodsUpdated={handlePeriodsUpdated}
          onClose={() => setShowPeriodManager(false)}
        />
      )}

      {showScheduleModal && (
        <ScheduleModal
          schedule={selectedSchedule}
          timeSlot={selectedTimeSlot}
          periods={periods}
          activeVersion={activeVersion}
          onSave={handleScheduleSaved}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {showWeeklyScheduleModal && activeVersion && (
        <WeeklyClassScheduleModal
          isOpen={showWeeklyScheduleModal}
          onClose={() => setShowWeeklyScheduleModal(false)}
          version={activeVersion}
          periods={periods}
          onScheduleCreated={() => {
            setShowWeeklyScheduleModal(false);
            loadSchedulesForCurrentView();
            showSuccess('Success', 'Weekly class schedule created successfully');
          }}
        />
      )}
    </div>
  );
};

export default ComprehensiveTimetable;
