-- SQL Script to Assign Classes to Computer Lab 2
-- Execute these statements directly in Supabase SQL Editor

-- First, get the Computer Lab 2 ID (for reference)
-- Computer Lab 2 ID: 86dd18a1-9660-45de-b4d5-8982b15aee4e

-- 1. Create the classes if they don't exist
-- First, check and insert only classes that don't already exist
INSERT INTO classes (name, description, grade_level, stream, is_active)
SELECT name, description, grade_level, stream, is_active
FROM (VALUES
    ('11 NM C', 'Grade 11 Non-Medical Section C', 11, 'Non-Medical', true),
    ('11 NM D', 'Grade 11 Non-Medical Section D', 11, 'Non-Medical', true),
    ('11 COM A', 'Grade 11 Commerce Section A', 11, 'Commerce', true),
    ('11 COM B', 'Grade 11 Commerce Section B', 11, 'Commerce', true),
    ('11 NMB', 'Grade 11 Non-Medical Section B', 11, 'Non-Medical', true),
    ('12 COM A', 'Grade 12 Commerce Section A', 12, 'Commerce', true),
    ('12 COM B', 'Grade 12 Commerce Section B', 12, 'Commerce', true),
    ('12 MED A', 'Grade 12 Medical Section A', 12, 'Medical', true),
    ('12 NM B', 'Grade 12 Non-Medical Section B', 12, 'Non-Medical', true),
    ('12 NM E', 'Grade 12 Non-Medical Section E', 12, 'Non-Medical', true)
) AS new_classes(name, description, grade_level, stream, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM classes WHERE classes.name = new_classes.name
);

-- 2. Create a class-lab assignment table if it doesn't exist
CREATE TABLE IF NOT EXISTS class_lab_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    lab_id UUID NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by VARCHAR(100) DEFAULT 'system',
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one class can only be assigned to one lab at a time
    UNIQUE(class_id, lab_id)
);

-- 3. Assign all specified classes to Computer Lab 2
-- Clear any existing assignments for these classes first
DELETE FROM class_lab_assignments 
WHERE class_id IN (
    SELECT id FROM classes 
    WHERE name IN (
        '11 NM C', '11 NM D', '11 COM A', '11 COM B', '11 NMB',
        '12 COM A', '12 COM B', '12 MED A', '12 NM B', '12 NM E'
    )
);

-- Insert new assignments to Computer Lab 2
INSERT INTO class_lab_assignments (class_id, lab_id, assigned_by, notes)
SELECT 
    c.id as class_id,
    '86dd18a1-9660-45de-b4d5-8982b15aee4e'::UUID as lab_id,
    'admin' as assigned_by,
    'Assigned to Computer Lab 2 as per requirement' as notes
FROM classes c
WHERE c.name IN (
    '11 NM C', '11 NM D', '11 COM A', '11 COM B', '11 NMB',
    '12 COM A', '12 COM B', '12 MED A', '12 NM B', '12 NM E'
);

-- 4. Verification query - Run this to confirm assignments
SELECT 
    c.name as class_name,
    c.grade_level,
    c.stream,
    l.name as lab_name,
    cla.assigned_at,
    cla.assigned_by,
    cla.notes
FROM class_lab_assignments cla
JOIN classes c ON cla.class_id = c.id
JOIN labs l ON cla.lab_id = l.id
WHERE l.name = 'Computer Lab 2'
ORDER BY c.grade_level, c.stream, c.name;

-- 5. Summary query - Count of assignments
SELECT 
    l.name as lab_name,
    COUNT(cla.id) as total_classes_assigned,
    STRING_AGG(c.name, ', ' ORDER BY c.name) as assigned_classes
FROM labs l
LEFT JOIN class_lab_assignments cla ON l.id = cla.lab_id
LEFT JOIN classes c ON cla.class_id = c.id
WHERE l.name = 'Computer Lab 2'
GROUP BY l.id, l.name;
