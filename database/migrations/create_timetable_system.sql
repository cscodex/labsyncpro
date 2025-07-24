-- Comprehensive Timetable System with Version Control
-- This migration creates a complete timetable management system

-- Create timetable_versions table for version control
CREATE TABLE IF NOT EXISTS timetable_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_number VARCHAR(20) NOT NULL, -- e.g., "v1.0", "v2.0"
    version_name VARCHAR(100) NOT NULL, -- e.g., "Spring 2024 Timetable"
    description TEXT,
    effective_from DATE NOT NULL,
    effective_until DATE, -- NULL for current version
    is_active BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create periods table for time slot definitions
CREATE TABLE IF NOT EXISTS periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timetable_version_id UUID NOT NULL REFERENCES timetable_versions(id) ON DELETE CASCADE,
    period_number INTEGER NOT NULL, -- 1, 2, 3, etc.
    period_name VARCHAR(50) NOT NULL, -- "Period 1", "Morning Session", etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60
    ) STORED,
    is_break BOOLEAN DEFAULT false, -- true for lunch/tea breaks
    break_duration_minutes INTEGER DEFAULT 0,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT periods_time_check CHECK (end_time > start_time),
    CONSTRAINT periods_unique_per_version UNIQUE (timetable_version_id, period_number)
);

-- Create timetable_schedules table for actual schedule entries
CREATE TABLE IF NOT EXISTS timetable_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timetable_version_id UUID NOT NULL REFERENCES timetable_versions(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
    
    -- Session details
    session_title VARCHAR(200) NOT NULL,
    session_type VARCHAR(50) DEFAULT 'lecture', -- lecture, lab, test, practical
    session_description TEXT,
    
    -- Date and recurrence
    schedule_date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(20), -- weekly, daily, custom
    recurrence_end_date DATE,
    
    -- Room and instructor assignment
    lab_id UUID REFERENCES labs(id),
    room_name VARCHAR(100), -- fallback if lab_id is null
    instructor_id UUID REFERENCES users(id),
    instructor_name VARCHAR(200), -- fallback if instructor_id is null
    
    -- Class/group assignment
    class_id UUID REFERENCES classes(id),
    group_id UUID REFERENCES groups(id),
    student_count INTEGER DEFAULT 0,
    max_capacity INTEGER,
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, cancelled, rescheduled
    notes TEXT,
    color_code VARCHAR(7) DEFAULT '#3B82F6', -- hex color for calendar display
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT schedules_date_check CHECK (
        recurrence_end_date IS NULL OR recurrence_end_date >= schedule_date
    )
);

-- Create timetable_conflicts table to track scheduling conflicts
CREATE TABLE IF NOT EXISTS timetable_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id_1 UUID NOT NULL REFERENCES timetable_schedules(id) ON DELETE CASCADE,
    schedule_id_2 UUID NOT NULL REFERENCES timetable_schedules(id) ON DELETE CASCADE,
    conflict_type VARCHAR(50) NOT NULL, -- room_conflict, instructor_conflict, class_conflict
    conflict_description TEXT,
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT conflicts_different_schedules CHECK (schedule_id_1 != schedule_id_2)
);

-- Create timetable_templates table for reusable schedule templates
CREATE TABLE IF NOT EXISTS timetable_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(100) NOT NULL,
    template_description TEXT,
    template_data JSONB NOT NULL, -- stores the template structure
    category VARCHAR(50) DEFAULT 'general', -- general, semester, weekly, etc.
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timetable_versions_effective_dates ON timetable_versions(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_timetable_versions_active ON timetable_versions(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_periods_version ON periods(timetable_version_id);
CREATE INDEX IF NOT EXISTS idx_periods_display_order ON periods(timetable_version_id, display_order);

CREATE INDEX IF NOT EXISTS idx_schedules_version ON timetable_schedules(timetable_version_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON timetable_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_period ON timetable_schedules(period_id);
CREATE INDEX IF NOT EXISTS idx_schedules_lab ON timetable_schedules(lab_id);
CREATE INDEX IF NOT EXISTS idx_schedules_instructor ON timetable_schedules(instructor_id);
CREATE INDEX IF NOT EXISTS idx_schedules_class ON timetable_schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_group ON timetable_schedules(group_id);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON timetable_schedules(status);

CREATE INDEX IF NOT EXISTS idx_conflicts_schedule1 ON timetable_conflicts(schedule_id_1);
CREATE INDEX IF NOT EXISTS idx_conflicts_schedule2 ON timetable_conflicts(schedule_id_2);
CREATE INDEX IF NOT EXISTS idx_conflicts_type ON timetable_conflicts(conflict_type);
CREATE INDEX IF NOT EXISTS idx_conflicts_unresolved ON timetable_conflicts(is_resolved) WHERE is_resolved = false;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_timetable_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_timetable_versions_updated_at
    BEFORE UPDATE ON timetable_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_timetable_updated_at();

CREATE TRIGGER update_periods_updated_at
    BEFORE UPDATE ON periods
    FOR EACH ROW
    EXECUTE FUNCTION update_timetable_updated_at();

CREATE TRIGGER update_schedules_updated_at
    BEFORE UPDATE ON timetable_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_timetable_updated_at();

CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON timetable_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_timetable_updated_at();

-- Create function to get active timetable version for a specific date
CREATE OR REPLACE FUNCTION get_active_timetable_version(target_date DATE DEFAULT CURRENT_DATE)
RETURNS UUID AS $$
DECLARE
    version_id UUID;
BEGIN
    SELECT id INTO version_id
    FROM timetable_versions
    WHERE effective_from <= target_date
      AND (effective_until IS NULL OR effective_until >= target_date)
      AND is_active = true
    ORDER BY effective_from DESC
    LIMIT 1;
    
    RETURN version_id;
END;
$$ language 'plpgsql';

-- Create function to create new timetable version
CREATE OR REPLACE FUNCTION create_timetable_version(
    p_version_name VARCHAR(100),
    p_description TEXT,
    p_effective_from DATE,
    p_created_by UUID,
    p_copy_from_version UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_version_id UUID;
    version_num VARCHAR(20);
    period_record RECORD;
BEGIN
    -- Generate version number
    SELECT COALESCE('v' || (MAX(CAST(SUBSTRING(version_number FROM 2) AS INTEGER)) + 1), 'v1.0')
    INTO version_num
    FROM timetable_versions
    WHERE version_number ~ '^v[0-9]+(\.[0-9]+)?$';
    
    -- Deactivate current active version if effective date is today or past
    IF p_effective_from <= CURRENT_DATE THEN
        UPDATE timetable_versions 
        SET is_active = false, effective_until = p_effective_from - INTERVAL '1 day'
        WHERE is_active = true;
    END IF;
    
    -- Create new version
    INSERT INTO timetable_versions (
        version_number, version_name, description, effective_from, 
        is_active, created_by
    ) VALUES (
        version_num, p_version_name, p_description, p_effective_from,
        (p_effective_from <= CURRENT_DATE), p_created_by
    ) RETURNING id INTO new_version_id;
    
    -- Copy periods from previous version if specified
    IF p_copy_from_version IS NOT NULL THEN
        FOR period_record IN 
            SELECT period_number, period_name, start_time, end_time, 
                   is_break, break_duration_minutes, display_order
            FROM periods 
            WHERE timetable_version_id = p_copy_from_version
            ORDER BY display_order
        LOOP
            INSERT INTO periods (
                timetable_version_id, period_number, period_name, start_time, 
                end_time, is_break, break_duration_minutes, display_order
            ) VALUES (
                new_version_id, period_record.period_number, period_record.period_name,
                period_record.start_time, period_record.end_time, period_record.is_break,
                period_record.break_duration_minutes, period_record.display_order
            );
        END LOOP;
    END IF;
    
    RETURN new_version_id;
END;
$$ language 'plpgsql';

-- Create function to detect scheduling conflicts
CREATE OR REPLACE FUNCTION detect_schedule_conflicts(p_schedule_id UUID)
RETURNS TABLE(conflict_id UUID, conflict_type VARCHAR, description TEXT) AS $$
BEGIN
    -- Room conflicts
    RETURN QUERY
    SELECT
        uuid_generate_v4() as conflict_id,
        'room_conflict'::VARCHAR as conflict_type,
        ('Room conflict: ' || COALESCE(l.name, s1.room_name) || ' is double-booked')::TEXT as description
    FROM timetable_schedules s1
    JOIN timetable_schedules s2 ON s1.id != s2.id
    LEFT JOIN labs l ON s1.lab_id = l.id
    WHERE s1.id = p_schedule_id
      AND s1.schedule_date = s2.schedule_date
      AND s1.period_id = s2.period_id
      AND (s1.lab_id = s2.lab_id OR s1.room_name = s2.room_name)
      AND s1.status = 'scheduled'
      AND s2.status = 'scheduled';

    -- Instructor conflicts
    RETURN QUERY
    SELECT
        uuid_generate_v4() as conflict_id,
        'instructor_conflict'::VARCHAR as conflict_type,
        ('Instructor conflict: ' || COALESCE(u.first_name || ' ' || u.last_name, s1.instructor_name) || ' is double-booked')::TEXT as description
    FROM timetable_schedules s1
    JOIN timetable_schedules s2 ON s1.id != s2.id
    LEFT JOIN users u ON s1.instructor_id = u.id
    WHERE s1.id = p_schedule_id
      AND s1.schedule_date = s2.schedule_date
      AND s1.period_id = s2.period_id
      AND (s1.instructor_id = s2.instructor_id OR s1.instructor_name = s2.instructor_name)
      AND s1.status = 'scheduled'
      AND s2.status = 'scheduled';

    -- Class conflicts
    RETURN QUERY
    SELECT
        uuid_generate_v4() as conflict_id,
        'class_conflict'::VARCHAR as conflict_type,
        ('Class conflict: Class is scheduled in multiple locations')::TEXT as description
    FROM timetable_schedules s1
    JOIN timetable_schedules s2 ON s1.id != s2.id
    WHERE s1.id = p_schedule_id
      AND s1.schedule_date = s2.schedule_date
      AND s1.period_id = s2.period_id
      AND s1.class_id = s2.class_id
      AND s1.status = 'scheduled'
      AND s2.status = 'scheduled';
END;
$$ language 'plpgsql';

-- Create function to get timetable for a specific date range
CREATE OR REPLACE FUNCTION get_timetable_for_date_range(
    p_start_date DATE,
    p_end_date DATE,
    p_lab_id UUID DEFAULT NULL,
    p_instructor_id UUID DEFAULT NULL,
    p_class_id UUID DEFAULT NULL
)
RETURNS TABLE(
    schedule_id UUID,
    version_number VARCHAR,
    period_name VARCHAR,
    start_time TIME,
    end_time TIME,
    schedule_date DATE,
    session_title VARCHAR,
    session_type VARCHAR,
    lab_name VARCHAR,
    instructor_name VARCHAR,
    class_name VARCHAR,
    group_name VARCHAR,
    status VARCHAR,
    color_code VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as schedule_id,
        tv.version_number,
        p.period_name,
        p.start_time,
        p.end_time,
        s.schedule_date,
        s.session_title,
        s.session_type,
        COALESCE(l.name, s.room_name) as lab_name,
        COALESCE(u.first_name || ' ' || u.last_name, s.instructor_name) as instructor_name,
        c.name as class_name,
        g.name as group_name,
        s.status,
        s.color_code
    FROM timetable_schedules s
    JOIN timetable_versions tv ON s.timetable_version_id = tv.id
    JOIN periods p ON s.period_id = p.id
    LEFT JOIN labs l ON s.lab_id = l.id
    LEFT JOIN users u ON s.instructor_id = u.id
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN groups g ON s.group_id = g.id
    WHERE s.schedule_date BETWEEN p_start_date AND p_end_date
      AND tv.effective_from <= s.schedule_date
      AND (tv.effective_until IS NULL OR tv.effective_until >= s.schedule_date)
      AND (p_lab_id IS NULL OR s.lab_id = p_lab_id)
      AND (p_instructor_id IS NULL OR s.instructor_id = p_instructor_id)
      AND (p_class_id IS NULL OR s.class_id = p_class_id)
    ORDER BY s.schedule_date, p.display_order;
END;
$$ language 'plpgsql';

-- Create view for current active timetable
CREATE OR REPLACE VIEW current_timetable AS
SELECT
    s.id,
    tv.version_number,
    tv.version_name,
    p.period_number,
    p.period_name,
    p.start_time,
    p.end_time,
    s.schedule_date,
    s.session_title,
    s.session_type,
    s.session_description,
    COALESCE(l.name, s.room_name) as lab_name,
    COALESCE(u.first_name || ' ' || u.last_name, s.instructor_name) as instructor_name,
    c.name as class_name,
    g.name as group_name,
    s.student_count,
    s.status,
    s.color_code,
    s.notes
FROM timetable_schedules s
JOIN timetable_versions tv ON s.timetable_version_id = tv.id
JOIN periods p ON s.period_id = p.id
LEFT JOIN labs l ON s.lab_id = l.id
LEFT JOIN users u ON s.instructor_id = u.id
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN groups g ON s.group_id = g.id
WHERE tv.is_active = true
  AND s.status = 'scheduled';

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
