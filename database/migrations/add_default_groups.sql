-- Migration: Add default group functionality
-- Add is_default column to groups table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'is_default') THEN
        ALTER TABLE groups ADD COLUMN is_default BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add description column to groups table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'description') THEN
        ALTER TABLE groups ADD COLUMN description TEXT;
    END IF;
END $$;

-- Add leader_id column to groups table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'leader_id') THEN
        ALTER TABLE groups ADD COLUMN leader_id UUID REFERENCES users(id);
    END IF;
END $$;

-- Drop the existing max_members constraint
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_max_members_check;

-- Add new constraint that allows unlimited members for default groups
ALTER TABLE groups ADD CONSTRAINT groups_max_members_check
CHECK (
    (is_default = true) OR
    (is_default = false AND max_members >= 3 AND max_members <= 10)
);

-- Create default groups for each existing class
INSERT INTO groups (name, class_id, max_members, is_default, description, leader_id)
SELECT
    CONCAT(c.class_code, ' - Default Group') as name,
    c.id as class_id,
    999999 as max_members, -- No limit for default groups
    true as is_default,
    'Default group for students not assigned to any specific group' as description,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1) as leader_id
FROM classes c
WHERE NOT EXISTS (
    SELECT 1 FROM groups g
    WHERE g.class_id = c.id AND g.is_default = true
);

-- Move all students who are not in any group to their class default group
-- First, we need to determine which class each student should belong to
-- For now, we'll create a temporary assignment based on student_id patterns
-- This is a placeholder - in a real system, you'd have proper enrollment data

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_groups_class_default ON groups(class_id, is_default);
CREATE INDEX IF NOT EXISTS idx_group_members_group_user ON group_members(group_id, user_id);
