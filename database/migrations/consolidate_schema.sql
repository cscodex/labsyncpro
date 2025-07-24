-- Schema Consolidation and Optimization Migration
-- This migration consolidates all schema changes and adds missing features

-- Add soft delete functionality to critical tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add version tracking for important entities
ALTER TABLE users ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add metadata columns for better tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create indexes for soft delete queries
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_classes_deleted_at ON classes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_groups_deleted_at ON groups(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schedules_deleted_at ON schedules(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_deleted_at ON assignments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_deleted_at ON submissions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grades_deleted_at ON grades(deleted_at) WHERE deleted_at IS NULL;

-- Create composite indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_groups_class_active ON groups(class_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schedules_date_active ON schedules(scheduled_date) WHERE deleted_at IS NULL;

-- Add constraints for data integrity
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_email_unique_active 
  EXCLUDE (email WITH =) WHERE (deleted_at IS NULL);

ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_student_id_unique_active 
  EXCLUDE (student_id WITH =) WHERE (deleted_at IS NULL AND student_id IS NOT NULL);

-- Create views for active records (commonly used queries)
CREATE OR REPLACE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_classes AS
SELECT * FROM classes WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_groups AS
SELECT * FROM groups WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_schedules AS
SELECT * FROM schedules WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_assignments AS
SELECT * FROM assignments WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_submissions AS
SELECT * FROM submissions WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_grades AS
SELECT * FROM grades WHERE deleted_at IS NULL;

-- Create functions for soft delete operations
CREATE OR REPLACE FUNCTION soft_delete_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE users 
    SET deleted_at = CURRENT_TIMESTAMP,
        is_active = false,
        version = version + 1
    WHERE id = user_id AND deleted_at IS NULL;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    IF affected_rows > 0 THEN
        -- Log the soft delete
        INSERT INTO audit_logs (
            user_id, action, resource_type, resource_id,
            old_values, new_values, created_at
        ) VALUES (
            user_id, 'SOFT_DELETE', 'USER', user_id::text,
            '{"deleted_at": null}'::jsonb,
            json_build_object('deleted_at', CURRENT_TIMESTAMP)::jsonb,
            CURRENT_TIMESTAMP
        );
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION restore_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE users 
    SET deleted_at = NULL,
        is_active = true,
        version = version + 1
    WHERE id = user_id AND deleted_at IS NOT NULL;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    IF affected_rows > 0 THEN
        -- Log the restore
        INSERT INTO audit_logs (
            user_id, action, resource_type, resource_id,
            old_values, new_values, created_at
        ) VALUES (
            user_id, 'RESTORE', 'USER', user_id::text,
            json_build_object('deleted_at', 'not null')::jsonb,
            '{"deleted_at": null}'::jsonb,
            CURRENT_TIMESTAMP
        );
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create function to permanently delete old soft-deleted records
CREATE OR REPLACE FUNCTION cleanup_soft_deleted_records(days_old INTEGER DEFAULT 90)
RETURNS TABLE(table_name TEXT, deleted_count INTEGER) AS $$
DECLARE
    cutoff_date TIMESTAMP WITH TIME ZONE;
    rec RECORD;
    sql_query TEXT;
    result_count INTEGER;
BEGIN
    cutoff_date := CURRENT_TIMESTAMP - INTERVAL '1 day' * days_old;
    
    -- Tables to clean up
    FOR rec IN 
        SELECT unnest(ARRAY['users', 'classes', 'groups', 'schedules', 'assignments', 'submissions', 'grades']) AS tbl
    LOOP
        sql_query := format('DELETE FROM %I WHERE deleted_at IS NOT NULL AND deleted_at < $1', rec.tbl);
        EXECUTE sql_query USING cutoff_date;
        GET DIAGNOSTICS result_count = ROW_COUNT;
        
        table_name := rec.tbl;
        deleted_count := result_count;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update version numbers
CREATE OR REPLACE FUNCTION update_version_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.version IS NOT NULL THEN
        NEW.version = OLD.version + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply version triggers to relevant tables
DROP TRIGGER IF EXISTS update_users_version ON users;
CREATE TRIGGER update_users_version
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_version_trigger();

DROP TRIGGER IF EXISTS update_assignments_version ON assignments;
CREATE TRIGGER update_assignments_version
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_version_trigger();

DROP TRIGGER IF EXISTS update_grades_version ON grades;
CREATE TRIGGER update_grades_version
    BEFORE UPDATE ON grades
    FOR EACH ROW
    EXECUTE FUNCTION update_version_trigger();

-- Create materialized view for dashboard statistics (performance optimization)
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM active_users WHERE role = 'student') as total_students,
    (SELECT COUNT(*) FROM active_users WHERE role = 'instructor') as total_instructors,
    (SELECT COUNT(*) FROM active_users WHERE role = 'admin') as total_admins,
    (SELECT COUNT(*) FROM active_groups) as total_groups,
    (SELECT COUNT(*) FROM active_classes) as total_classes,
    (SELECT COUNT(*) FROM labs WHERE is_active = true) as total_labs,
    (SELECT SUM(total_computers) FROM labs WHERE is_active = true) as total_computers,
    (SELECT COUNT(*) FROM active_schedules WHERE scheduled_date >= CURRENT_DATE) as upcoming_schedules,
    (SELECT COUNT(*) FROM active_submissions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as recent_submissions,
    (SELECT COUNT(*) FROM active_grades WHERE graded_at >= CURRENT_DATE - INTERVAL '7 days') as recent_grades,
    CURRENT_TIMESTAMP as last_updated;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_last_updated ON dashboard_stats(last_updated);

-- Create function to refresh dashboard stats
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- Add foreign key constraints that were missing
ALTER TABLE group_members 
ADD CONSTRAINT IF NOT EXISTS fk_group_members_group_active 
FOREIGN KEY (group_id) REFERENCES groups(id) 
DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE schedule_assignments 
ADD CONSTRAINT IF NOT EXISTS fk_schedule_assignments_schedule_active 
FOREIGN KEY (schedule_id) REFERENCES schedules(id) 
DEFERRABLE INITIALLY DEFERRED;

-- Create function to validate data consistency
CREATE OR REPLACE FUNCTION validate_data_consistency()
RETURNS TABLE(issue_type TEXT, issue_description TEXT, affected_count INTEGER) AS $$
BEGIN
    -- Check for orphaned group members
    RETURN QUERY
    SELECT 
        'ORPHANED_GROUP_MEMBERS'::TEXT,
        'Group members without valid groups'::TEXT,
        COUNT(*)::INTEGER
    FROM group_members gm
    LEFT JOIN active_groups g ON gm.group_id = g.id
    WHERE g.id IS NULL;
    
    -- Check for orphaned schedule assignments
    RETURN QUERY
    SELECT 
        'ORPHANED_SCHEDULE_ASSIGNMENTS'::TEXT,
        'Schedule assignments without valid schedules'::TEXT,
        COUNT(*)::INTEGER
    FROM schedule_assignments sa
    LEFT JOIN active_schedules s ON sa.schedule_id = s.id
    WHERE s.id IS NULL;
    
    -- Check for users without proper email format
    RETURN QUERY
    SELECT 
        'INVALID_EMAIL_FORMAT'::TEXT,
        'Users with invalid email format'::TEXT,
        COUNT(*)::INTEGER
    FROM active_users
    WHERE email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
    
    -- Check for duplicate active emails
    RETURN QUERY
    SELECT 
        'DUPLICATE_EMAILS'::TEXT,
        'Multiple active users with same email'::TEXT,
        COUNT(*)::INTEGER
    FROM (
        SELECT email, COUNT(*) as cnt
        FROM active_users
        GROUP BY email
        HAVING COUNT(*) > 1
    ) duplicates;
END;
$$ LANGUAGE plpgsql;
