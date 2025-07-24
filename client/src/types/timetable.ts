// Timetable Type Definitions
// This file contains all the TypeScript interfaces for the timetable system

export interface TimetableVersion {
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

export interface Period {
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

export interface WeeklyClassSchedule {
  id: string;
  timetable_version_id: string;
  period_id: string;
  class_id?: string;
  subject_name: string;
  instructor_id?: string;
  instructor_name?: string;
  lab_id?: string;
  room_name?: string;
  day_of_week: number; // 1=Monday, 7=Sunday
  start_date: string;
  end_date?: string;
  exclude_second_saturdays: boolean;
  exclude_sundays: boolean;
  custom_holiday_dates: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimetableSchedule {
  id: string;
  version_number: string;
  version_name: string;
  period_number: number;
  period_name: string;
  start_time: string;
  end_time: string;
  schedule_date: string;
  session_title: string;
  session_type: string;
  session_description?: string;
  lab_name?: string;
  instructor_name?: string;
  class_name?: string;
  group_name?: string;
  student_count: number;
  max_capacity?: number;
  status: string;
  color_code: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TimetableConflict {
  conflict_id: string;
  conflict_type: string;
  description: string;
}

export interface VersionComparison {
  periods: Array<{
    type: string;
    period_number: number;
    version1_name?: string;
    version2_name?: string;
    version1_start?: string;
    version2_start?: string;
    version1_end?: string;
    version2_end?: string;
    change_type: string;
  }>;
  schedules: {
    type: string;
    version1_count: number;
    version2_count: number;
  };
  summary: {
    periodsChanged: number;
    totalPeriods: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  issues: Array<{
    type: string;
    count?: number;
    gaps?: string[];
    overlaps?: Array<{ period1: string; period2: string }>;
    description: string;
  }>;
  validatedAt: string;
}

export interface TimetableStats {
  totalSchedules: number;
  scheduledSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  uniqueInstructors: number;
  uniqueLabs: number;
  uniqueClasses: number;
  sessionTypes: Record<string, number>;
}

// Configuration Interfaces
export interface TimetableConfig {
  id: string;
  max_lectures_per_day: number;
  lecture_duration_minutes: number;
  break_duration_minutes: number;
  start_time: string;
  end_time: string;
  working_days: string[];
  created_at: string;
  updated_at: string;
}

export interface BreakConfiguration {
  afterLecture: number; // After which lecture number (1, 2, 3, etc.)
  durationMinutes: number; // Duration of this specific break
  name?: string; // Optional custom name for the break
}

export interface PeriodGenerationConfig {
  schoolStartTime: string;
  schoolEndTime: string;
  lectureDurationMinutes: number;
  numberOfBreaks?: number;
  breakConfigurations?: BreakConfiguration[];
  includeBreaks?: boolean;
  // WEF date is required for timing changes
  effectiveFromDate?: string;
}

export interface GeneratedPeriod {
  periodNumber: number;
  periodName: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  breakDurationMinutes: number;
  displayOrder: number;
}

export interface PeriodGenerationResult {
  periods: GeneratedPeriod[];
  totalPeriods: number;
  totalBreaks: number;
  totalDuration: number;
  totalBreakTime: number;
  schoolDayDuration: number;
  utilizationPercentage: number;
}

// Component Props Interfaces
export interface TimetableComponentProps {
  userRole: string;
  userId: string;
}

export interface VersionManagerProps {
  versions: TimetableVersion[];
  activeVersion: TimetableVersion | null;
  onVersionChange: (versionId: string) => void;
  onVersionCreated: () => void;
  onClose: () => void;
}

export interface PeriodManagerProps {
  version: TimetableVersion;
  periods: Period[];
  onPeriodsUpdated: () => void;
  onClose: () => void;
}

export interface PeriodConfigurationModalProps {
  version: TimetableVersion;
  config: TimetableConfig | null;
  onConfigUpdated: () => void;
  onClose: () => void;
}

export interface ScheduleModalProps {
  schedule: TimetableSchedule | null;
  timeSlot: {
    date: string;
    periodId: string;
    periodName: string;
    startTime: string;
    endTime: string;
  } | null;
  periods: Period[];
  onSave: () => void;
  onClose: () => void;
}

export interface TimetableViewProps {
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

export interface ExportProps {
  schedules: TimetableSchedule[];
  periods: Period[];
  activeVersion: TimetableVersion | null;
}
