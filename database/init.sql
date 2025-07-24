-- LabSyncPro Database Initialization Script
-- This script creates the database and all required tables

-- Create database (run this separately if needed)
-- CREATE DATABASE labsyncpro;

-- Connect to the database
\c labsyncpro;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin');
CREATE TYPE schedule_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE submission_status AS ENUM ('pending', 'submitted', 'late', 'graded');
CREATE TYPE submission_type AS ENUM ('file', 'text', 'mixed');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    student_id VARCHAR(8) UNIQUE,
    profile_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_student_id CHECK (
        (role = 'student' AND student_id IS NOT NULL AND student_id ~ '^[0-9]{8}$') OR
        (role != 'student')
    )
);

-- Classes table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    grade INTEGER NOT NULL CHECK (grade IN (11, 12)),
    stream VARCHAR(50) NOT NULL CHECK (stream IN ('Non-Medical', 'Medical', 'Commerce')),
    capacity INTEGER NOT NULL DEFAULT 50,
    instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(name, grade, stream)
);

-- Labs table
CREATE TABLE labs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    total_computers INTEGER NOT NULL,
    total_seats INTEGER NOT NULL,
    location VARCHAR(255),
    equipment JSONB DEFAULT '[]',
    availability_schedule JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_capacity CHECK (total_computers > 0 AND total_seats > 0)
);

-- Groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    max_members INTEGER NOT NULL DEFAULT 4 CHECK (max_members BETWEEN 3 AND 4),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(name, class_id)
);

-- Group members table
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(group_id, user_id)
);

-- Schedules table
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    lab_id UUID NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 120,
    deadline TIMESTAMP WITH TIME ZONE,
    status schedule_status DEFAULT 'scheduled',
    max_participants INTEGER,
    assignment_type VARCHAR(50) DEFAULT 'group', -- 'group' or 'individual'
    requirements JSONB DEFAULT '{}',
    resources JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT positive_duration CHECK (duration_minutes > 0),
    CONSTRAINT future_schedule CHECK (scheduled_date > created_at)
);

-- Schedule assignments table (links schedules to groups or individual students)
CREATE TABLE schedule_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_seat INTEGER,
    assigned_computer INTEGER,
    status VARCHAR(50) DEFAULT 'assigned',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Either group_id or user_id must be set, but not both
    CONSTRAINT assignment_target CHECK (
        (group_id IS NOT NULL AND user_id IS NULL) OR
        (group_id IS NULL AND user_id IS NOT NULL)
    ),
    
    UNIQUE(schedule_id, group_id),
    UNIQUE(schedule_id, user_id),
    UNIQUE(schedule_id, assigned_seat),
    UNIQUE(schedule_id, assigned_computer)
);

-- Submissions table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    submission_type submission_type NOT NULL DEFAULT 'mixed',
    file_paths JSONB DEFAULT '[]',
    text_content TEXT,
    metadata JSONB DEFAULT '{}',
    status submission_status DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE,
    is_late BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Either group_id or user_id must be set, but not both
    CONSTRAINT submission_owner CHECK (
        (group_id IS NOT NULL AND user_id IS NULL) OR
        (group_id IS NULL AND user_id IS NOT NULL)
    ),
    
    UNIQUE(schedule_id, group_id),
    UNIQUE(schedule_id, user_id)
);

-- File uploads table
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('assignment_response', 'output_test')),
    upload_status VARCHAR(20) DEFAULT 'uploaded' CHECK (upload_status IN ('uploading', 'uploaded', 'failed')),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 10485760), -- 10MB limit
    CONSTRAINT valid_pdf_type CHECK (mime_type = 'application/pdf')
);

-- Grades table
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    grade_letter VARCHAR(2), -- A+, A, B+, B, etc.
    feedback TEXT,
    rubric_data JSONB DEFAULT '{}',
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_score CHECK (score >= 0 AND score <= max_score),
    CONSTRAINT positive_max_score CHECK (max_score > 0),

    UNIQUE(submission_id)
);

-- Schedule files table (for assignment files uploaded by instructors)
CREATE TABLE schedule_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('assignment_file', 'resource_file')),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(schedule_id, file_type) -- Only one assignment file per schedule
);

-- Created assignments table for assignment creation workflow
CREATE TABLE IF NOT EXISTS created_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    pdf_filename VARCHAR(255),
    pdf_file_size INTEGER,
    creation_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assignment submissions table (for the new assignment system)
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_distribution_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_response_filename VARCHAR(255),
    output_test_filename VARCHAR(255),
    submitted_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_locked BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),

    UNIQUE(assignment_distribution_id, user_id)
);

-- Grade scale configuration table (admin configurable grade ranges)
CREATE TABLE IF NOT EXISTS grade_scales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade_letter VARCHAR(2) NOT NULL,
    min_percentage DECIMAL(5,2) NOT NULL,
    max_percentage DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_percentage_range CHECK (min_percentage >= 0 AND max_percentage <= 100 AND min_percentage <= max_percentage),
    CONSTRAINT valid_grade_letter CHECK (grade_letter IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')),

    UNIQUE(grade_letter)
);

-- Insert default grade scale
INSERT INTO grade_scales (grade_letter, min_percentage, max_percentage) VALUES
('A+', 97.00, 100.00),
('A', 93.00, 96.99),
('A-', 90.00, 92.99),
('B+', 87.00, 89.99),
('B', 83.00, 86.99),
('B-', 80.00, 82.99),
('C+', 77.00, 79.99),
('C', 73.00, 76.99),
('C-', 70.00, 72.99),
('D+', 67.00, 69.99),
('D', 63.00, 66.99),
('D-', 60.00, 62.99),
('F', 0.00, 59.99)
ON CONFLICT (grade_letter) DO NOTHING;

-- Assignment grades table (for grading assignment submissions)
CREATE TABLE IF NOT EXISTS assignment_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    grade_letter VARCHAR(2), -- A+, A, B+, B, etc.
    percentage DECIMAL(5,2) GENERATED ALWAYS AS (ROUND((score / max_score) * 100, 2)) STORED,
    feedback TEXT,
    rubric_data JSONB DEFAULT '{}',
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_assignment_score CHECK (score >= 0 AND score <= max_score),
    CONSTRAINT positive_assignment_max_score CHECK (max_score > 0),

    UNIQUE(assignment_submission_id)
);

-- Timetable configuration table (admin configurable settings)
CREATE TABLE IF NOT EXISTS timetable_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    max_lectures_per_day INTEGER NOT NULL DEFAULT 8,
    lecture_duration_minutes INTEGER NOT NULL DEFAULT 45,
    break_duration_minutes INTEGER NOT NULL DEFAULT 15,
    start_time TIME NOT NULL DEFAULT '08:00:00',
    end_time TIME NOT NULL DEFAULT '17:00:00',
    working_days JSONB NOT NULL DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_lecture_count CHECK (max_lectures_per_day BETWEEN 1 AND 12),
    CONSTRAINT valid_duration CHECK (lecture_duration_minutes BETWEEN 30 AND 120),
    CONSTRAINT valid_break CHECK (break_duration_minutes BETWEEN 5 AND 60),
    CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Time slots table (generated based on configuration)
CREATE TABLE IF NOT EXISTS time_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_number INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_break BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_slot_number CHECK (slot_number BETWEEN 1 AND 20),
    CONSTRAINT valid_slot_time CHECK (start_time < end_time),
    UNIQUE(slot_number)
);

-- Weekly timetable entries
CREATE TABLE IF NOT EXISTS timetable_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_start_date DATE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday
    time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    subject VARCHAR(100),
    instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    lab_id UUID REFERENCES labs(id) ON DELETE SET NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(week_start_date, day_of_week, time_slot_id, class_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_classes_instructor ON classes(instructor_id);
CREATE INDEX idx_groups_class ON groups(class_id);
CREATE INDEX idx_groups_leader ON groups(leader_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_schedules_lab ON schedules(lab_id);
CREATE INDEX idx_schedules_instructor ON schedules(instructor_id);
CREATE INDEX idx_schedules_class ON schedules(class_id);
CREATE INDEX idx_schedules_date ON schedules(scheduled_date);
CREATE INDEX idx_schedule_assignments_schedule ON schedule_assignments(schedule_id);
CREATE INDEX idx_schedule_assignments_group ON schedule_assignments(group_id);
CREATE INDEX idx_schedule_assignments_user ON schedule_assignments(user_id);
CREATE INDEX idx_submissions_schedule ON submissions(schedule_id);
CREATE INDEX idx_submissions_group ON submissions(group_id);
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_file_uploads_submission ON file_uploads(submission_id);
CREATE INDEX idx_file_uploads_type ON file_uploads(file_type);
CREATE INDEX idx_file_uploads_uploaded_by ON file_uploads(uploaded_by);
CREATE INDEX idx_grades_submission ON grades(submission_id);
CREATE INDEX idx_grades_instructor ON grades(instructor_id);
CREATE INDEX idx_created_assignments_created_by ON created_assignments(created_by);
CREATE INDEX idx_created_assignments_status ON created_assignments(status);
CREATE INDEX idx_created_assignments_creation_date ON created_assignments(creation_date);
CREATE INDEX idx_timetable_entries_week_day ON timetable_entries(week_start_date, day_of_week);
CREATE INDEX idx_timetable_entries_class ON timetable_entries(class_id);
CREATE INDEX idx_timetable_entries_instructor ON timetable_entries(instructor_id);
CREATE INDEX idx_timetable_entries_time_slot ON timetable_entries(time_slot_id);
CREATE INDEX idx_time_slots_number ON time_slots(slot_number);
CREATE INDEX idx_assignment_grades_submission ON assignment_grades(assignment_submission_id);
CREATE INDEX idx_assignment_grades_instructor ON assignment_grades(instructor_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_labs_updated_at BEFORE UPDATE ON labs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_file_uploads_updated_at BEFORE UPDATE ON file_uploads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_created_assignments_updated_at BEFORE UPDATE ON created_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timetable_config_updated_at BEFORE UPDATE ON timetable_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timetable_entries_updated_at BEFORE UPDATE ON timetable_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignment_grades_updated_at BEFORE UPDATE ON assignment_grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default timetable configuration
INSERT INTO timetable_config (max_lectures_per_day, lecture_duration_minutes, break_duration_minutes, start_time, end_time)
VALUES (8, 45, 15, '08:00:00', '17:00:00')
ON CONFLICT DO NOTHING;

-- Insert default time slots (8 lectures with breaks)
INSERT INTO time_slots (slot_number, start_time, end_time, is_break) VALUES
(1, '08:00:00', '08:45:00', false),
(2, '08:45:00', '09:00:00', true),
(3, '09:00:00', '09:45:00', false),
(4, '09:45:00', '10:00:00', true),
(5, '10:00:00', '10:45:00', false),
(6, '10:45:00', '11:00:00', true),
(7, '11:00:00', '11:45:00', false),
(8, '11:45:00', '12:00:00', true),
(9, '12:00:00', '12:45:00', false),
(10, '12:45:00', '13:00:00', true),
(11, '13:00:00', '13:45:00', false),
(12, '13:45:00', '14:00:00', true),
(13, '14:00:00', '14:45:00', false),
(14, '14:45:00', '15:00:00', true),
(15, '15:00:00', '15:45:00', false),
(16, '15:45:00', '16:00:00', true)
ON CONFLICT (slot_number) DO NOTHING;

-- Insert sample data
INSERT INTO labs (name, total_computers, total_seats, location) VALUES
('Lab 1', 15, 50, 'Computer Science Building - Ground Floor'),
('Lab 2', 19, 50, 'Computer Science Building - First Floor');

-- Insert sample admin user (password: admin123)
INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES
('Admin', 'User', 'admin@labsyncpro.com', '$2b$10$gs5Aqyzhxh/xV66Vf9BiKOrrbuQxHFbY6bA1v77wmb6q0/7iWHwre', 'admin');

-- Insert sample instructor (password: instructor123)
INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES
('John', 'Smith', 'instructor@labsyncpro.com', '$2b$10$7VaaPaMnnGCExmZN.dQZ2.yA7HShFLNRXvtMhvMdKjv1122g36wzy', 'instructor');

-- Insert sample classes
INSERT INTO classes (name, grade, stream, instructor_id) VALUES
('11th Non-Medical A', 11, 'Non-Medical', (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com')),
('11th Non-Medical B', 11, 'Non-Medical', (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com')),
('11th Non-Medical C', 11, 'Non-Medical', (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com')),
('11th Medical A', 11, 'Medical', (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com')),
('11th Medical B', 11, 'Medical', (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com')),
('11th Commerce A', 11, 'Commerce', (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com')),
('12th Non-Medical A', 12, 'Non-Medical', (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com')),
('12th Non-Medical B', 12, 'Non-Medical', (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com')),
('12th Medical A', 12, 'Medical', (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com')),
('12th Commerce A', 12, 'Commerce', (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com'));

COMMIT;
