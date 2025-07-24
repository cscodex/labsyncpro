-- Migration to add schedule_files table and fix classes schema
-- Run this script to update the database schema

-- First, check if schedule_files table exists, if not create it
CREATE TABLE IF NOT EXISTS schedule_files (
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

-- Add class_code column if it doesn't exist
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_code VARCHAR(20);

-- Add section column if it doesn't exist
ALTER TABLE classes ADD COLUMN IF NOT EXISTS section VARCHAR(5);

-- Update existing records to have class_code based on name
UPDATE classes SET
    class_code = name,
    section = CASE
        WHEN name LIKE '% A' THEN 'A'
        WHEN name LIKE '% B' THEN 'B'
        WHEN name LIKE '% C' THEN 'C'
        WHEN name LIKE '% D' THEN 'D'
        WHEN name LIKE '% E' THEN 'E'
        WHEN name LIKE '% F' THEN 'F'
        WHEN name LIKE '% G' THEN 'G'
        WHEN name LIKE '% H' THEN 'H'
        ELSE 'A'
    END
WHERE class_code IS NULL;

-- First, temporarily drop the stream constraint if it exists
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_stream_check;

-- Update stream values to match expected format
UPDATE classes SET stream =
    CASE
        WHEN stream = 'Non-Medical' THEN 'NM'
        WHEN stream = 'Medical' THEN 'M'
        WHEN stream = 'Commerce' THEN 'COM'
        ELSE stream
    END
WHERE stream IN ('Non-Medical', 'Medical', 'Commerce');

-- Re-add the constraint with the correct values
ALTER TABLE classes ADD CONSTRAINT classes_stream_check CHECK (stream IN ('NM', 'M', 'COM', 'Non-Medical', 'Medical', 'Commerce'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedule_files_schedule_id ON schedule_files(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_files_file_type ON schedule_files(file_type);
CREATE INDEX IF NOT EXISTS idx_classes_class_code ON classes(class_code);
CREATE INDEX IF NOT EXISTS idx_classes_grade_stream ON classes(grade, stream);
