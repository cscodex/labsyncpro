-- LabSyncPro Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'instructor', 'student')) NOT NULL,
    student_id VARCHAR(20) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Labs table
CREATE TABLE IF NOT EXISTS labs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL DEFAULT 50,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Computers table
CREATE TABLE IF NOT EXISTS computers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_id UUID REFERENCES labs(id) ON DELETE CASCADE,
    computer_name VARCHAR(50) NOT NULL,
    seat_number VARCHAR(20),
    specifications JSONB,
    status VARCHAR(20) CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')) DEFAULT 'available',
    is_functional BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    grade_level INTEGER,
    stream VARCHAR(50),
    instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    max_members INTEGER DEFAULT 4,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Created assignments table
CREATE TABLE IF NOT EXISTS created_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    pdf_filename VARCHAR(255),
    pdf_path VARCHAR(500),
    -- Google Drive integration fields
    google_drive_file_id VARCHAR(255),
    google_drive_view_link TEXT,
    google_drive_download_link TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    status VARCHAR(20) CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedules table (assignment distribution)
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignment_id UUID REFERENCES created_assignments(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    lab_id UUID REFERENCES labs(id) ON DELETE SET NULL,
    instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
    assignee_type VARCHAR(20) CHECK (assignee_type IN ('class', 'group', 'individual')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    submission_type VARCHAR(20) CHECK (submission_type IN ('file', 'text', 'both')) NOT NULL,
    file_path VARCHAR(500),
    text_content TEXT,
    -- Google Drive integration fields
    google_drive_file_id VARCHAR(255),
    google_drive_view_link TEXT,
    google_drive_download_link TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    original_filename VARCHAR(255),
    status VARCHAR(20) CHECK (status IN ('draft', 'submitted', 'late', 'graded')) DEFAULT 'draft',
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grades table
CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    score DECIMAL(5,2),
    max_score DECIMAL(5,2) DEFAULT 100.00,
    feedback TEXT,
    grade_scale VARCHAR(10),
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timetable versions table
CREATE TABLE IF NOT EXISTS timetable_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_number VARCHAR(20) NOT NULL,
    version_name VARCHAR(100) NOT NULL,
    description TEXT,
    effective_from DATE NOT NULL,
    effective_until DATE,
    is_active BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timetable configuration table
CREATE TABLE IF NOT EXISTS timetable_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_time TIME NOT NULL DEFAULT '08:00:00',
    end_time TIME NOT NULL DEFAULT '17:00:00',
    lecture_duration_minutes INTEGER NOT NULL DEFAULT 50,
    break_duration_minutes INTEGER NOT NULL DEFAULT 10,
    number_of_lectures INTEGER NOT NULL DEFAULT 8,
    number_of_breaks INTEGER NOT NULL DEFAULT 2,
    break_after_periods INTEGER[] DEFAULT ARRAY[0, 4],
    academic_year_start DATE DEFAULT '2024-04-01',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_computers_lab_id ON computers(lab_id);
CREATE INDEX IF NOT EXISTS idx_groups_class_id ON groups(class_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_scheduled_date ON schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_submissions_schedule_id ON submissions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_submission_id ON grades(submission_id);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES (
    'admin@labsync.local', 
    '$2b$10$rQZ8kHWKQOuXlY5qJ9X9/.K8YQZ8kHWKQOuXlY5qJ9X9/.K8YQZ8kH', 
    'System', 
    'Administrator', 
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Insert default labs
INSERT INTO labs (name, description, capacity, location) VALUES
    ('Computer Lab 1', 'Main computer laboratory with 50 workstations', 50, 'Building A, Floor 2'),
    ('Computer Lab 2', 'Secondary computer laboratory', 50, 'Building A, Floor 3'),
    ('Programming Lab', 'Specialized programming laboratory', 30, 'Building B, Floor 1'),
    ('Network Lab', 'Network and security laboratory', 25, 'Building B, Floor 2')
ON CONFLICT DO NOTHING;

-- Insert default timetable configuration
INSERT INTO timetable_config (
    start_time, 
    end_time, 
    lecture_duration_minutes, 
    break_duration_minutes,
    number_of_lectures,
    number_of_breaks,
    break_after_periods
) VALUES (
    '08:00:00',
    '17:00:00',
    50,
    10,
    8,
    2,
    ARRAY[0, 4]
) ON CONFLICT DO NOTHING;
