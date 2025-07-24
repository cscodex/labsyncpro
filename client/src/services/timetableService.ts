import api from './api';
import type {
  TimetableVersion,
  Period,
  TimetableSchedule,
  TimetableConflict,
  VersionComparison,
  ValidationResult,
  TimetableStats,
  WeeklyClassSchedule,
  TimetableConfig,
  PeriodGenerationConfig,
  PeriodGenerationResult
} from '../types/timetable';

// All interfaces are now imported from ../types/timetable

class TimetableService {
  // Version Management
  async getTimetableVersions(): Promise<TimetableVersion[]> {
    const response = await api.get('/timetable/versions');
    return response.data.versions;
  }

  async getActiveTimetableVersion(date?: string): Promise<TimetableVersion> {
    const params = date ? { date } : {};
    const response = await api.get('/timetable/versions/active', { params });
    return response.data.version;
  }

  async createTimetableVersion(versionData: {
    versionName: string;
    description?: string;
    effectiveFrom: string;
    copyFromVersion?: string;
    copySchedules?: boolean;
  }): Promise<{ version: TimetableVersion; migration: any }> {
    const response = await api.post('/timetable/versions', versionData);
    return response.data;
  }



  async getTimetableVersionHistory(versionId?: string): Promise<TimetableVersion[]> {
    const params = versionId ? { versionId } : {};
    const response = await api.get('/timetable/versions/history', { params });
    return response.data.history;
  }

  async compareTimetableVersions(version1: string, version2: string): Promise<VersionComparison> {
    const response = await api.get('/timetable/versions/compare', {
      params: { version1, version2 }
    });
    return response.data.comparison;
  }

  async validateTimetableVersion(versionId: string): Promise<ValidationResult> {
    const response = await api.get(`/timetable/versions/${versionId}/validate`);
    return response.data.validation;
  }

  async archiveOldVersions(cutoffDate: string): Promise<any> {
    const response = await api.post('/timetable/versions/archive', { cutoffDate });
    return response.data;
  }

  // Period Management
  async getPeriodsForVersion(versionId: string): Promise<Period[]> {
    const response = await api.get(`/timetable/versions/${versionId}/periods`);
    return response.data.periods;
  }

  async updatePeriodsForVersion(versionId: string, periods: Partial<Period>[]): Promise<Period[]> {
    const response = await api.put(`/timetable/versions/${versionId}/periods`, { periods });
    return response.data.periods;
  }

  // Schedule Management
  async getTimetableSchedules(filters: {
    startDate?: string;
    endDate?: string;
    labId?: string;
    instructorId?: string;
    classId?: string;
    groupId?: string;
  } = {}): Promise<TimetableSchedule[]> {
    const response = await api.get('/timetable/schedules', { params: filters });
    return response.data.schedules;
  }

  async createSchedule(scheduleData: {
    sessionTitle: string;
    sessionType?: string;
    sessionDescription?: string;
    scheduleDate: string;
    periodId: string;
    labId?: string;
    roomName?: string;
    instructorId?: string;
    instructorName?: string;
    classId?: string;
    groupId?: string;
    studentCount?: number;
    maxCapacity?: number;
    colorCode?: string;
    notes?: string;
  }): Promise<{ schedule: TimetableSchedule; conflicts?: TimetableConflict[]; warning?: string }> {
    const response = await api.post('/timetable/schedules', scheduleData);
    return response.data;
  }

  async updateSchedule(scheduleId: string, updateData: Partial<TimetableSchedule>): Promise<TimetableSchedule> {
    const response = await api.put(`/timetable/schedules/${scheduleId}`, updateData);
    return response.data.schedule;
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    await api.delete(`/timetable/schedules/${scheduleId}`);
  }

  async getScheduleConflicts(scheduleId: string): Promise<TimetableConflict[]> {
    const response = await api.get(`/timetable/schedules/${scheduleId}/conflicts`);
    return response.data.conflicts;
  }

  // Convenience Methods
  async getCurrentWeekTimetable(): Promise<{
    schedules: TimetableSchedule[];
    weekStart: string;
    weekEnd: string;
  }> {
    const response = await api.get('/timetable/current-week');
    return response.data;
  }

  async getTimetableStats(startDate?: string, endDate?: string): Promise<TimetableStats> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get('/timetable/stats', { params });
    return response.data.stats;
  }

  // Legacy compatibility
  async getWeeklyTimetable(weekStart?: string, classId?: string): Promise<any> {
    const params: any = {};
    if (weekStart) params.week_start = weekStart;
    if (classId) params.class_id = classId;
    
    const response = await api.get('/timetable/weekly', { params });
    return response.data;
  }

  // Utility methods
  formatTime(time: string): string {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getWeekDates(weekStart: string): string[] {
    const start = new Date(weekStart);
    const dates = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  }

  getDayName(dayIndex: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex] || '';
  }

  getSessionTypeColor(sessionType: string): string {
    const colors: Record<string, string> = {
      lecture: '#3B82F6',
      lab: '#10B981',
      test: '#EF4444',
      practical: '#F59E0B'
    };
    return colors[sessionType] || '#6B7280';
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      scheduled: '#10B981',
      completed: '#6B7280',
      cancelled: '#EF4444',
      rescheduled: '#F59E0B',
      migrated: '#8B5CF6'
    };
    return colors[status] || '#6B7280';
  }

  // Weekly Class Schedule Management
  async getWeeklySchedules(versionId: string): Promise<WeeklyClassSchedule[]> {
    const response = await api.get(`/timetable/versions/${versionId}/weekly-schedules`);
    return response.data.schedules;
  }

  async createWeeklySchedule(scheduleData: Partial<WeeklyClassSchedule>): Promise<WeeklyClassSchedule> {
    const response = await api.post('/timetable/weekly-schedules', scheduleData);
    return response.data.schedule;
  }

  async updateWeeklySchedule(scheduleId: string, scheduleData: Partial<WeeklyClassSchedule>): Promise<WeeklyClassSchedule> {
    const response = await api.put(`/timetable/weekly-schedules/${scheduleId}`, scheduleData);
    return response.data.schedule;
  }

  async deleteWeeklySchedule(scheduleId: string): Promise<void> {
    await api.delete(`/timetable/weekly-schedules/${scheduleId}`);
  }

  async generateSchedulesFromWeekly(versionId: string, weeklyScheduleId?: string): Promise<{
    generated: number;
    skipped: number;
    conflicts: TimetableConflict[];
  }> {
    const params = weeklyScheduleId ? { weeklyScheduleId } : {};
    const response = await api.post(`/timetable/versions/${versionId}/generate-from-weekly`, params);
    return response.data;
  }

  // Configuration Management
  async getTimetableConfig(): Promise<TimetableConfig> {
    const response = await api.get('/timetable/config');
    return response.data.config;
  }

  async updateTimetableConfig(config: Partial<TimetableConfig>): Promise<TimetableConfig> {
    const response = await api.put('/timetable/config', config);
    return response.data.config;
  }

  async generatePeriodsFromConfig(config: PeriodGenerationConfig): Promise<PeriodGenerationResult> {
    const response = await api.post('/timetable/config/generate-periods', config);
    return response.data;
  }

  // Holiday calculation utilities
  calculateHolidays(startDate: string, endDate: string, options: {
    excludeSundays?: boolean;
    excludeSecondSaturdays?: boolean;
    customHolidayDates?: string[];
  }): string[] {
    const holidays: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const dateStr = date.toISOString().split('T')[0];

      // Check for Sundays
      if (options.excludeSundays && dayOfWeek === 0) {
        holidays.push(dateStr);
        continue;
      }

      // Check for second Saturdays
      if (options.excludeSecondSaturdays && dayOfWeek === 6) {
        const dayOfMonth = date.getDate();
        if (dayOfMonth >= 8 && dayOfMonth <= 14) { // Second Saturday falls between 8th and 14th
          holidays.push(dateStr);
          continue;
        }
      }

      // Check custom holiday dates
      if (options.customHolidayDates?.includes(dateStr)) {
        holidays.push(dateStr);
      }
    }

    return holidays;
  }

  // Generate dates for weekly schedule excluding holidays
  generateWeeklyDates(
    dayOfWeek: number, // 1=Monday, 7=Sunday
    startDate: string,
    endDate: string,
    holidayOptions: {
      excludeSundays?: boolean;
      excludeSecondSaturdays?: boolean;
      customHolidayDates?: string[];
    }
  ): string[] {
    const dates: string[] = [];
    const holidays = this.calculateHolidays(startDate, endDate, holidayOptions);

    // Find first occurrence of the target day of week
    const start = new Date(startDate);
    const targetDay = dayOfWeek === 7 ? 0 : dayOfWeek; // Convert to JS day format

    // Move to first occurrence of target day
    while (start.getDay() !== targetDay) {
      start.setDate(start.getDate() + 1);
    }

    const end = new Date(endDate);

    // Generate all occurrences of the target day
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 7)) {
      const dateStr = date.toISOString().split('T')[0];

      // Skip if it's a holiday
      if (!holidays.includes(dateStr)) {
        dates.push(dateStr);
      }
    }

    return dates;
  }
}

export const timetableService = new TimetableService();

// Re-export all types from the types file for convenience
export type {
  TimetableVersion,
  Period,
  TimetableSchedule,
  TimetableConflict,
  VersionComparison,
  ValidationResult,
  TimetableStats
} from '../types/timetable';
