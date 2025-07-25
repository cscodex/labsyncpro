-- Update database schema for text-based submissions (no file uploads)
-- Run this to prepare for Render deployment with Supabase

-- Remove Google Drive columns from created_assignments
ALTER TABLE created_assignments 
DROP COLUMN IF EXISTS google_drive_file_id,
DROP COLUMN IF EXISTS google_drive_view_link,
DROP COLUMN IF EXISTS google_drive_download_link,
DROP COLUMN IF EXISTS google_drive_folder_id,
DROP COLUMN IF EXISTS migration_status,
DROP COLUMN IF EXISTS migrated_at,
DROP COLUMN IF EXISTS original_file_path;

-- Remove Google Drive columns from submissions
ALTER TABLE submissions 
DROP COLUMN IF EXISTS google_drive_file_ids,
DROP COLUMN IF EXISTS google_drive_links,
DROP COLUMN IF EXISTS migration_status,
DROP COLUMN IF EXISTS migrated_at,
DROP COLUMN IF EXISTS original_file_paths;

-- Update submissions table for text-based coding submissions
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS code_input TEXT,
ADD COLUMN IF NOT EXISTS code_output TEXT,
ADD COLUMN IF NOT EXISTS programming_language VARCHAR(50),
ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS memory_usage_kb INTEGER,
ADD COLUMN IF NOT EXISTS compiler_version VARCHAR(100);

-- Remove file-related columns from submissions
ALTER TABLE submissions 
DROP COLUMN IF EXISTS file_paths,
DROP COLUMN IF EXISTS file_path;

-- Update submission_type to reflect new options
-- Update existing submissions to use 'text' type
UPDATE submissions 
SET submission_type = 'text' 
WHERE submission_type IN ('file', 'both');

-- Add check constraint for submission types
ALTER TABLE submissions 
DROP CONSTRAINT IF EXISTS submissions_submission_type_check;

ALTER TABLE submissions 
ADD CONSTRAINT submissions_submission_type_check 
CHECK (submission_type IN ('text', 'code'));

-- Remove file migration log table (no longer needed)
DROP TABLE IF EXISTS file_migration_log;

-- Update created_assignments to remove file requirements
ALTER TABLE created_assignments 
DROP COLUMN IF EXISTS pdf_filename,
DROP COLUMN IF EXISTS pdf_file_size,
DROP COLUMN IF EXISTS pdf_path;

-- Add assignment content fields for text-based assignments
ALTER TABLE created_assignments 
ADD COLUMN IF NOT EXISTS assignment_content TEXT,
ADD COLUMN IF NOT EXISTS expected_output TEXT,
ADD COLUMN IF NOT EXISTS programming_language VARCHAR(50),
ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3;

-- Create coding_problems table for structured programming assignments
CREATE TABLE IF NOT EXISTS coding_problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES created_assignments(id) ON DELETE CASCADE,
    problem_title VARCHAR(255) NOT NULL,
    problem_description TEXT NOT NULL,
    input_format TEXT,
    output_format TEXT,
    sample_input TEXT,
    sample_output TEXT,
    constraints TEXT,
    test_cases JSONB,
    solution_template TEXT,
    programming_language VARCHAR(50) NOT NULL,
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    points INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create submission_attempts table for tracking multiple attempts
CREATE TABLE IF NOT EXISTS submission_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    code_submitted TEXT NOT NULL,
    output_generated TEXT,
    is_correct BOOLEAN DEFAULT false,
    execution_time_ms INTEGER,
    memory_usage_kb INTEGER,
    error_message TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(submission_id, attempt_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coding_problems_assignment_id ON coding_problems(assignment_id);
CREATE INDEX IF NOT EXISTS idx_coding_problems_language ON coding_problems(programming_language);
CREATE INDEX IF NOT EXISTS idx_submission_attempts_submission_id ON submission_attempts(submission_id);
CREATE INDEX IF NOT EXISTS idx_submissions_type ON submissions(submission_type);
CREATE INDEX IF NOT EXISTS idx_submissions_language ON submissions(programming_language);

-- Update existing data
UPDATE created_assignments 
SET assignment_content = COALESCE(description, 'Assignment content will be provided by instructor'),
    programming_language = 'python',
    difficulty_level = 'beginner',
    time_limit_minutes = 60,
    max_attempts = 3
WHERE assignment_content IS NULL;

-- Insert sample coding problem for existing assignments
INSERT INTO coding_problems (assignment_id, problem_title, problem_description, input_format, output_format, sample_input, sample_output, programming_language)
SELECT 
    id as assignment_id,
    name as problem_title,
    COALESCE(assignment_content, 'Write a program to solve this problem.') as problem_description,
    'Single line input' as input_format,
    'Single line output' as output_format,
    '5' as sample_input,
    '5' as sample_output,
    COALESCE(programming_language, 'python') as programming_language
FROM created_assignments 
WHERE id NOT IN (SELECT assignment_id FROM coding_problems WHERE assignment_id IS NOT NULL);

-- Clean up any remaining file references
UPDATE submissions 
SET text_content = COALESCE(text_content, 'Student will paste their code and output here'),
    code_input = 'Input will be provided by student',
    code_output = 'Output will be provided by student',
    programming_language = 'python'
WHERE text_content IS NULL OR text_content = '';

-- Show summary of changes
SELECT 
    'SCHEMA UPDATE COMPLETE' as status,
    (SELECT COUNT(*) FROM created_assignments) as total_assignments,
    (SELECT COUNT(*) FROM coding_problems) as coding_problems_created,
    (SELECT COUNT(*) FROM submissions) as total_submissions,
    (SELECT COUNT(*) FROM submissions WHERE submission_type = 'text') as text_submissions,
    (SELECT COUNT(*) FROM submissions WHERE submission_type = 'code') as code_submissions;
