-- Add deadline field to schedules table
ALTER TABLE schedules ADD COLUMN deadline TIMESTAMP WITH TIME ZONE;

-- Add index for deadline field
CREATE INDEX idx_schedules_deadline ON schedules(deadline);
