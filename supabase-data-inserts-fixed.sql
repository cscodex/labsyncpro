-- LabSyncPro Data Insertion Script for Supabase (CORRECTED VERSION)
-- Execute these SQL statements directly in your Supabase SQL editor

-- First, let's check what tables exist and their structure
-- Run this first to see your table schemas:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- 1. Insert Users with PROPER password hashes for 'admin123'
INSERT INTO users (id, email, password_hash, first_name, last_name, role, student_id, is_active, created_at, updated_at) VALUES
('38588c11-a71d-4730-8278-c2efb1cb4436', 'admin@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System', 'Administrator', 'admin', NULL, true, NOW(), NOW()),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'instructor@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Instructor', 'instructor', NULL, true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440001', 'student1@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alice', 'Johnson', 'student', '20240001', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'student2@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Bob', 'Smith', 'student', '20240002', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'student3@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carol', 'Davis', 'student', '20240003', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 2. Check if classes table exists and insert data
-- If this fails, the table might have different column names
-- Try this alternative version if the above fails:

-- Option A: Standard classes table
INSERT INTO classes (id, class_code, grade, stream, section, description, created_at, updated_at) VALUES
('class-001', '11 NM A', 11, 'NM', 'A', 'Grade 11 Non-Medical Section A', NOW(), NOW()),
('class-002', '12 COM B', 12, 'COM', 'B', 'Grade 12 Commerce Section B', NOW(), NOW()),
('class-003', '11 SCI C', 11, 'SCI', 'C', 'Grade 11 Science Section C', NOW(), NOW())
ON CONFLICT (class_code) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- Option B: If classes table has different columns, try this:
-- INSERT INTO classes (id, name, description, created_at, updated_at) VALUES
-- ('class-001', '11 NM A', 'Grade 11 Non-Medical Section A', NOW(), NOW()),
-- ('class-002', '12 COM B', 'Grade 12 Commerce Section B', NOW(), NOW()),
-- ('class-003', '11 SCI C', 'Grade 11 Science Section C', NOW(), NOW())
-- ON CONFLICT (name) DO UPDATE SET
--   description = EXCLUDED.description,
--   updated_at = NOW();

-- 3. Insert Labs (adjust columns as needed)
INSERT INTO labs (id, name, location, total_computers, total_seats, description, created_at, updated_at) VALUES
('lab-001', 'Computer Lab 1', 'Science Building - Ground Floor', 25, 50, 'Main computer laboratory with latest hardware', NOW(), NOW()),
('lab-002', 'Computer Lab 2', 'Science Building - First Floor', 30, 50, 'Advanced programming laboratory', NOW(), NOW()),
('lab-003', 'Network Lab', 'IT Building - Second Floor', 20, 40, 'Networking and cybersecurity lab', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  location = EXCLUDED.location,
  total_computers = EXCLUDED.total_computers,
  total_seats = EXCLUDED.total_seats,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Alternative if labs table has different structure:
-- INSERT INTO labs (id, name, description, created_at, updated_at) VALUES
-- ('lab-001', 'Computer Lab 1', 'Main computer laboratory with latest hardware', NOW(), NOW()),
-- ('lab-002', 'Computer Lab 2', 'Advanced programming laboratory', NOW(), NOW()),
-- ('lab-003', 'Network Lab', 'Networking and cybersecurity lab', NOW(), NOW())
-- ON CONFLICT (name) DO UPDATE SET
--   description = EXCLUDED.description,
--   updated_at = NOW();

-- 4. Insert Groups (basic version)
INSERT INTO groups (id, class_id, group_name, description, leader_id, created_at, updated_at) VALUES
('group-001', 'class-001', 'Team Alpha', 'Database design project group', '550e8400-e29b-41d4-a716-446655440001', NOW(), NOW()),
('group-002', 'class-001', 'Team Beta', 'Web development project group', '550e8400-e29b-41d4-a716-446655440002', NOW(), NOW()),
('group-003', 'class-002', 'Commerce Group 1', 'Business application development', '550e8400-e29b-41d4-a716-446655440003', NOW(), NOW())
ON CONFLICT (class_id, group_name) DO UPDATE SET
  description = EXCLUDED.description,
  leader_id = EXCLUDED.leader_id,
  updated_at = NOW();

-- Alternative if groups table has different structure:
-- INSERT INTO groups (id, name, description, created_at, updated_at) VALUES
-- ('group-001', 'Team Alpha', 'Database design project group', NOW(), NOW()),
-- ('group-002', 'Team Beta', 'Web development project group', NOW(), NOW()),
-- ('group-003', 'Commerce Group 1', 'Business application development', NOW(), NOW())
-- ON CONFLICT (name) DO UPDATE SET
--   description = EXCLUDED.description,
--   updated_at = NOW();

-- 5. MINIMAL SAFE INSERTION - Just users for now
-- If other tables fail, at least get the users working:

-- Ensure admin and instructor users exist with correct passwords
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at) VALUES
('admin@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System', 'Administrator', 'admin', true, NOW(), NOW()),
('instructor@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Instructor', 'instructor', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_active = true,
  updated_at = NOW();

-- Add some students
INSERT INTO users (email, password_hash, first_name, last_name, role, student_id, is_active, created_at, updated_at) VALUES
('student1@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alice', 'Johnson', 'student', '20240001', true, NOW(), NOW()),
('student2@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Bob', 'Smith', 'student', '20240002', true, NOW(), NOW()),
('student3@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carol', 'Davis', 'student', '20240003', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  student_id = EXCLUDED.student_id,
  is_active = true,
  updated_at = NOW();

-- Verify users are inserted correctly
SELECT email, first_name, last_name, role, is_active FROM users ORDER BY role, email;

-- Check what tables exist in your database
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Check users table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;
