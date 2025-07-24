-- Setup script for comprehensive timetable system
-- Run this script to set up the timetable database and fix user accounts

-- First, fix the user accounts
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) VALUES
('admin@labsyncpro.com', '$2b$10$7VaaPaMnnGCExmZN.dQZ2.yA7HShFLNRXvtMhvMdKjv1122g36wzy', 'System', 'Administrator', 'admin', true)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    is_active = true;

INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) VALUES
('instructor@labsyncpro.com', '$2b$10$7VaaPaMnnGCExmZN.dQZ2.yA7HShFLNRXvtMhvMdKjv1122g36wzy', 'Test', 'Instructor', 'instructor', true)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    is_active = true;

INSERT INTO users (student_id, email, password_hash, first_name, last_name, role, is_active) VALUES
('20240999', 'student@labsyncpro.com', '$2b$10$7VaaPaMnnGCExmZN.dQZ2.yA7HShFLNRXvtMhvMdKjv1122g36wzy', 'Test', 'Student', 'student', true)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    is_active = true;

-- Now create the timetable system tables
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create timetable_versions table for version control
CREATE TABLE IF NOT EXISTS timetable_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_number VARCHAR(20) NOT NULL,
    version_name VARCHAR(100) NOT NULL,
    description TEXT,
    effective_from DATE NOT NULL,
    effective_until DATE,
    is_active BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create periods table for time slot definitions
CREATE TABLE IF NOT EXISTS periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timetable_version_id UUID NOT NULL REFERENCES timetable_versions(id) ON DELETE CASCADE,
    period_number INTEGER NOT NULL,
    period_name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60
    ) STORED,
    lecture_duration_minutes INTEGER DEFAULT 90,
    number_of_lectures INTEGER DEFAULT 1,
    is_break BOOLEAN DEFAULT false,
    break_duration_minutes INTEGER DEFAULT 0,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT periods_time_check CHECK (end_time > start_time),
    CONSTRAINT periods_unique_per_version UNIQUE (timetable_version_id, period_number),
    CONSTRAINT lecture_duration_check CHECK (lecture_duration_minutes > 0),
    CONSTRAINT number_of_lectures_check CHECK (number_of_lectures > 0)
);

-- Create weekly_class_schedules table for recurring weekly lectures
CREATE TABLE IF NOT EXISTS weekly_class_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timetable_version_id UUID NOT NULL REFERENCES timetable_versions(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id),

    -- Schedule details
    subject_name VARCHAR(200) NOT NULL,
    instructor_id UUID REFERENCES users(id),
    instructor_name VARCHAR(200),
    lab_id UUID REFERENCES labs(id),
    room_name VARCHAR(100),

    -- Weekly recurrence settings
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday
    start_date DATE NOT NULL DEFAULT '2024-04-01', -- Starting from April 1st
    end_date DATE,

    -- Holiday exclusions
    exclude_second_saturdays BOOLEAN DEFAULT true,
    exclude_sundays BOOLEAN DEFAULT true,
    custom_holiday_dates JSONB DEFAULT '[]',

    -- Status and metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT weekly_schedule_unique UNIQUE (timetable_version_id, period_id, day_of_week, class_id)
);

-- Create timetable_schedules table for actual schedule entries
CREATE TABLE IF NOT EXISTS timetable_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timetable_version_id UUID NOT NULL REFERENCES timetable_versions(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
    weekly_schedule_id UUID REFERENCES weekly_class_schedules(id) ON DELETE SET NULL,

    -- Session details
    session_title VARCHAR(200) NOT NULL,
    session_type VARCHAR(50) DEFAULT 'lecture',
    session_description TEXT,

    -- Date and recurrence
    schedule_date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(20),
    recurrence_end_date DATE,
    is_generated_from_weekly BOOLEAN DEFAULT false,

    -- Room and instructor assignment
    lab_id UUID REFERENCES labs(id),
    room_name VARCHAR(100),
    instructor_id UUID REFERENCES users(id),
    instructor_name VARCHAR(200),
    
    -- Class/group assignment
    class_id UUID REFERENCES classes(id),
    group_id UUID REFERENCES groups(id),
    student_count INTEGER DEFAULT 0,
    max_capacity INTEGER,
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'scheduled',
    notes TEXT,
    color_code VARCHAR(7) DEFAULT '#3B82F6',
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timetable_versions_effective_dates ON timetable_versions(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_timetable_versions_active ON timetable_versions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_periods_version ON periods(timetable_version_id);
CREATE INDEX IF NOT EXISTS idx_schedules_version ON timetable_schedules(timetable_version_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON timetable_schedules(schedule_date);

-- Insert default timetable version
INSERT INTO timetable_versions (
    version_number, version_name, description, effective_from, is_active
) VALUES (
    'v1.0', 'Default Timetable', 'Initial timetable configuration', CURRENT_DATE, true
) ON CONFLICT DO NOTHING;

-- Insert default periods for the default version
DO $$
DECLARE
    default_version_id UUID;
BEGIN
    SELECT id INTO default_version_id 
    FROM timetable_versions 
    WHERE version_number = 'v1.0' 
    LIMIT 1;
    
    IF default_version_id IS NOT NULL THEN
        INSERT INTO periods (timetable_version_id, period_number, period_name, start_time, end_time, display_order) VALUES
        (default_version_id, 1, 'Period 1', '09:00:00', '10:30:00', 1),
        (default_version_id, 2, 'Period 2', '10:45:00', '12:15:00', 2),
        (default_version_id, 3, 'Period 3', '13:15:00', '14:45:00', 3),
        (default_version_id, 4, 'Period 4', '15:00:00', '16:30:00', 4)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Verify the setup
SELECT 'Users created:' as info, COUNT(*) as count FROM users WHERE email LIKE '%labsyncpro%';
SELECT 'Timetable versions:' as info, COUNT(*) as count FROM timetable_versions;
SELECT 'Periods created:' as info, COUNT(*) as count FROM periods;

\echo 'Timetable system setup completed successfully!'
\echo 'Login credentials:'
\echo 'Admin: admin@labsyncpro.com / admin123'
\echo 'Instructor: instructor@labsyncpro.com / admin123'
\echo 'Student: student@labsyncpro.com / admin123'
