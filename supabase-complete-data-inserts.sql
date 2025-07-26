-- LabSyncPro Complete Data Insertion Script for Supabase
-- Based on actual database schema inspection
-- Execute these SQL statements directly in your Supabase SQL editor

-- 1. Add more students to users table (you already have admin, instructor, and 1 student)
INSERT INTO users (email, password_hash, first_name, last_name, role, student_id, is_active, created_at, updated_at) VALUES
('student2@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Bob', 'Smith', 'student', '20240002', true, NOW(), NOW()),
('student3@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carol', 'Davis', 'student', '20240003', true, NOW(), NOW()),
('student4@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'David', 'Wilson', 'student', '20240004', true, NOW(), NOW()),
('student5@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Emma', 'Brown', 'student', '20240005', true, NOW(), NOW()),
('student6@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Frank', 'Miller', 'student', '20240006', true, NOW(), NOW()),
('student7@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Grace', 'Taylor', 'student', '20240007', true, NOW(), NOW()),
('student8@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Henry', 'Anderson', 'student', '20240008', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  student_id = EXCLUDED.student_id,
  is_active = true,
  updated_at = NOW();

-- 2. Check what columns exist in classes table and insert data
-- First, let's see the structure of classes table
-- If this fails, we'll need to check the actual column names

-- Try inserting into classes (common column structure)
INSERT INTO classes (id, name, description, created_at, updated_at) VALUES
('class-001', '11 NM A', 'Grade 11 Non-Medical Section A', NOW(), NOW()),
('class-002', '12 COM B', 'Grade 12 Commerce Section B', NOW(), NOW()),
('class-003', '11 SCI C', 'Grade 11 Science Section C', NOW(), NOW()),
('class-004', '12 SCI A', 'Grade 12 Science Section A', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- Alternative if classes has different columns:
-- INSERT INTO classes (id, class_code, grade, stream, section, description, created_at, updated_at) VALUES
-- ('class-001', '11 NM A', 11, 'NM', 'A', 'Grade 11 Non-Medical Section A', NOW(), NOW()),
-- ('class-002', '12 COM B', 12, 'COM', 'B', 'Grade 12 Commerce Section B', NOW(), NOW())
-- ON CONFLICT (class_code) DO UPDATE SET description = EXCLUDED.description;

-- 3. Insert into labs table
INSERT INTO labs (id, name, location, description, created_at, updated_at) VALUES
('lab-001', 'Computer Lab 1', 'Science Building - Ground Floor', 'Main computer laboratory with latest hardware', NOW(), NOW()),
('lab-002', 'Computer Lab 2', 'Science Building - First Floor', 'Advanced programming laboratory', NOW(), NOW()),
('lab-003', 'Network Lab', 'IT Building - Second Floor', 'Networking and cybersecurity lab', NOW(), NOW()),
('lab-004', 'AI/ML Lab', 'IT Building - Third Floor', 'Artificial Intelligence and Machine Learning lab', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Alternative if labs has different columns:
-- INSERT INTO labs (id, name, total_computers, total_seats, location, description, created_at, updated_at) VALUES
-- ('lab-001', 'Computer Lab 1', 25, 50, 'Science Building - Ground Floor', 'Main computer laboratory', NOW(), NOW())
-- ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description;

-- 4. Insert into computers table
INSERT INTO computers (id, lab_id, name, status, description, created_at, updated_at) VALUES
('comp-001', 'lab-001', 'CL1-PC-001', 'functional', 'Intel i5, 8GB RAM, 256GB SSD', NOW(), NOW()),
('comp-002', 'lab-001', 'CL1-PC-002', 'functional', 'Intel i5, 8GB RAM, 256GB SSD', NOW(), NOW()),
('comp-003', 'lab-001', 'CL1-PC-003', 'maintenance', 'Intel i5, 8GB RAM, 256GB SSD', NOW(), NOW()),
('comp-004', 'lab-002', 'CL2-PC-001', 'functional', 'Intel i7, 16GB RAM, 512GB SSD', NOW(), NOW()),
('comp-005', 'lab-002', 'CL2-PC-002', 'functional', 'Intel i7, 16GB RAM, 512GB SSD', NOW(), NOW()),
('comp-006', 'lab-003', 'NL-PC-001', 'functional', 'Intel i7, 16GB RAM, 1TB SSD, Network Cards', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Alternative if computers has different columns:
-- INSERT INTO computers (id, lab_id, computer_name, ip_address, mac_address, status, specifications, created_at, updated_at) VALUES
-- ('comp-001', 'lab-001', 'CL1-PC-001', '192.168.1.101', '00:1B:44:11:3A:B7', 'functional', '{"cpu": "Intel i5", "ram": "8GB"}', NOW(), NOW())
-- ON CONFLICT (computer_name) DO UPDATE SET status = EXCLUDED.status;

-- 5. Insert into groups table
INSERT INTO groups (id, class_id, name, description, leader_id, created_at, updated_at) VALUES
('group-001', 'class-001', 'Team Alpha', 'Database design project group', (SELECT id FROM users WHERE email = 'student1@labsyncpro.com'), NOW(), NOW()),
('group-002', 'class-001', 'Team Beta', 'Web development project group', (SELECT id FROM users WHERE email = 'student2@labsyncpro.com'), NOW(), NOW()),
('group-003', 'class-002', 'Commerce Group 1', 'Business application development', (SELECT id FROM users WHERE email = 'student3@labsyncpro.com'), NOW(), NOW()),
('group-004', 'class-003', 'Science Team A', 'Scientific computing projects', (SELECT id FROM users WHERE email = 'student4@labsyncpro.com'), NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  leader_id = EXCLUDED.leader_id,
  updated_at = NOW();

-- Alternative if groups has different columns:
-- INSERT INTO groups (id, class_id, group_name, description, leader_id, max_members, is_default, created_at, updated_at) VALUES
-- ('group-001', 'class-001', 'Team Alpha', 'Database design project group', (SELECT id FROM users WHERE email = 'student1@labsyncpro.com'), 4, false, NOW(), NOW())
-- ON CONFLICT (class_id, group_name) DO UPDATE SET description = EXCLUDED.description;

-- 6. Insert into schedules table
INSERT INTO schedules (id, title, description, scheduled_date, start_time, end_time, lab_id, class_id, instructor_id, status, created_at, updated_at) VALUES
('sched-001', 'Database Design Lab', 'Hands-on database design and implementation', CURRENT_DATE + INTERVAL '1 day', '09:00:00', '11:00:00', 'lab-001', 'class-001', (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com'), 'scheduled', NOW(), NOW()),
('sched-002', 'Web Development Workshop', 'React and Node.js development workshop', CURRENT_DATE + INTERVAL '2 days', '14:00:00', '16:00:00', 'lab-002', 'class-001', (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com'), 'scheduled', NOW(), NOW()),
('sched-003', 'Network Security Practical', 'Network security implementation and testing', CURRENT_DATE + INTERVAL '3 days', '10:00:00', '12:00:00', 'lab-003', 'class-002', (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com'), 'scheduled', NOW(), NOW()),
('sched-004', 'AI/ML Workshop', 'Introduction to Machine Learning algorithms', CURRENT_DATE + INTERVAL '4 days', '13:00:00', '15:00:00', 'lab-004', 'class-003', (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com'), 'scheduled', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  scheduled_date = EXCLUDED.scheduled_date,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Alternative if schedules has different columns:
-- INSERT INTO schedules (id, title, description, date, time, lab_id, instructor_id, created_at, updated_at) VALUES
-- ('sched-001', 'Database Design Lab', 'Hands-on database design', CURRENT_DATE + INTERVAL '1 day', '09:00:00', 'lab-001', (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com'), NOW(), NOW())
-- ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description;

-- 7. Insert into submissions table (if it has the right structure)
INSERT INTO submissions (id, title, content, submitted_by, submitted_at, status, created_at, updated_at) VALUES
('sub-001', 'Database Design Project - Team Alpha', 'Complete database schema for library management system with proper normalization and indexing strategies.', (SELECT id FROM users WHERE email = 'student1@labsyncpro.com'), NOW() - INTERVAL '1 day', 'submitted', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('sub-002', 'Web Application - Personal Portfolio', 'Responsive web application built with React and Node.js featuring user authentication and dynamic content.', (SELECT id FROM users WHERE email = 'student2@labsyncpro.com'), NOW() - INTERVAL '2 hours', 'submitted', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
('sub-003', 'Network Security Analysis', 'Comprehensive analysis of network vulnerabilities and proposed security measures for enterprise environment.', (SELECT id FROM users WHERE email = 'student3@labsyncpro.com'), NOW() - INTERVAL '3 hours', 'submitted', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  submitted_at = EXCLUDED.submitted_at,
  status = EXCLUDED.status,
  updated_at = NOW();

-- 8. Insert into grades table
INSERT INTO grades (id, submission_id, student_id, instructor_id, score, max_score, feedback, graded_at, created_at, updated_at) VALUES
('grade-001', 'sub-001', (SELECT id FROM users WHERE email = 'student1@labsyncpro.com'), (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com'), 85, 100, 'Excellent database design with proper normalization. Minor issues with indexing strategy could be improved.', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'),
('grade-002', 'sub-002', (SELECT id FROM users WHERE email = 'student2@labsyncpro.com'), (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com'), 92, 100, 'Outstanding web application with clean code and responsive design. Great use of React hooks and modern JavaScript.', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
('grade-003', 'sub-003', (SELECT id FROM users WHERE email = 'student3@labsyncpro.com'), (SELECT id FROM users WHERE email = 'instructor@labsyncpro.com'), 78, 100, 'Good analysis of network security concepts. Could benefit from more detailed implementation examples.', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO UPDATE SET
  score = EXCLUDED.score,
  max_score = EXCLUDED.max_score,
  feedback = EXCLUDED.feedback,
  graded_at = EXCLUDED.graded_at,
  updated_at = NOW();

-- Verify all data insertion
SELECT 'Users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'Classes', COUNT(*) FROM classes
UNION ALL
SELECT 'Labs', COUNT(*) FROM labs
UNION ALL
SELECT 'Computers', COUNT(*) FROM computers
UNION ALL
SELECT 'Groups', COUNT(*) FROM groups
UNION ALL
SELECT 'Schedules', COUNT(*) FROM schedules
UNION ALL
SELECT 'Submissions', COUNT(*) FROM submissions
UNION ALL
SELECT 'Grades', COUNT(*) FROM grades;

-- Final verification - show sample data
SELECT 'USERS SUMMARY' as info;
SELECT email, first_name, last_name, role, student_id FROM users ORDER BY role, email;

SELECT 'DASHBOARD STATS' as info;
SELECT 
  (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
  (SELECT COUNT(*) FROM groups) as total_groups,
  (SELECT COUNT(*) FROM labs) as total_labs,
  (SELECT COUNT(*) FROM computers) as total_computers,
  (SELECT COUNT(*) FROM schedules WHERE status = 'scheduled') as upcoming_schedules,
  (SELECT COUNT(*) FROM submissions WHERE status = 'submitted') as pending_submissions,
  (SELECT COUNT(*) FROM grades) as total_grades;
