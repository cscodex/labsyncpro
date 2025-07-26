-- LabSyncPro Data Insertion Script for Supabase
-- Execute these SQL statements directly in your Supabase SQL editor

-- 1. Insert Users (Admin, Instructor, Students)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, student_id, is_active, created_at, updated_at) VALUES
('38588c11-a71d-4730-8278-c2efb1cb4436', 'admin@labsyncpro.com', '$2a$10$rQJ5K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'System', 'Administrator', 'admin', NULL, true, NOW(), NOW()),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'instructor@labsyncpro.com', '$2a$10$rQJ5K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'Test', 'Instructor', 'instructor', NULL, true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440001', 'student1@labsyncpro.com', '$2a$10$rQJ5K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'Alice', 'Johnson', 'student', '20240001', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'student2@labsyncpro.com', '$2a$10$rQJ5K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'Bob', 'Smith', 'student', '20240002', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'student3@labsyncpro.com', '$2a$10$rQJ5K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'Carol', 'Davis', 'student', '20240003', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'student4@labsyncpro.com', '$2a$10$rQJ5K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'David', 'Wilson', 'student', '20240004', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'student5@labsyncpro.com', '$2a$10$rQJ5K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'Emma', 'Brown', 'student', '20240005', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 2. Insert Classes
INSERT INTO classes (id, class_code, grade, stream, section, description, created_at, updated_at) VALUES
('class-001', '11 NM A', 11, 'NM', 'A', 'Grade 11 Non-Medical Section A', NOW(), NOW()),
('class-002', '12 COM B', 12, 'COM', 'B', 'Grade 12 Commerce Section B', NOW(), NOW()),
('class-003', '11 SCI C', 11, 'SCI', 'C', 'Grade 11 Science Section C', NOW(), NOW())
ON CONFLICT (class_code) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- 3. Insert Labs
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

-- 4. Insert Computers
INSERT INTO computers (id, lab_id, computer_name, ip_address, mac_address, status, specifications, created_at, updated_at) VALUES
('comp-001', 'lab-001', 'CL1-PC-001', '192.168.1.101', '00:1B:44:11:3A:B7', 'functional', '{"cpu": "Intel i5", "ram": "8GB", "storage": "256GB SSD"}', NOW(), NOW()),
('comp-002', 'lab-001', 'CL1-PC-002', '192.168.1.102', '00:1B:44:11:3A:B8', 'functional', '{"cpu": "Intel i5", "ram": "8GB", "storage": "256GB SSD"}', NOW(), NOW()),
('comp-003', 'lab-001', 'CL1-PC-003', '192.168.1.103', '00:1B:44:11:3A:B9', 'maintenance', '{"cpu": "Intel i5", "ram": "8GB", "storage": "256GB SSD"}', NOW(), NOW()),
('comp-004', 'lab-002', 'CL2-PC-001', '192.168.2.101', '00:1B:44:11:3A:C1', 'functional', '{"cpu": "Intel i7", "ram": "16GB", "storage": "512GB SSD"}', NOW(), NOW()),
('comp-005', 'lab-002', 'CL2-PC-002', '192.168.2.102', '00:1B:44:11:3A:C2', 'functional', '{"cpu": "Intel i7", "ram": "16GB", "storage": "512GB SSD"}', NOW(), NOW())
ON CONFLICT (computer_name) DO UPDATE SET
  ip_address = EXCLUDED.ip_address,
  status = EXCLUDED.status,
  specifications = EXCLUDED.specifications,
  updated_at = NOW();

-- 5. Insert Groups
INSERT INTO groups (id, class_id, group_name, description, leader_id, max_members, is_default, created_at, updated_at) VALUES
('group-001', 'class-001', 'Team Alpha', 'Database design project group', '550e8400-e29b-41d4-a716-446655440001', 4, false, NOW(), NOW()),
('group-002', 'class-001', 'Team Beta', 'Web development project group', '550e8400-e29b-41d4-a716-446655440002', 4, false, NOW(), NOW()),
('group-003', 'class-002', 'Commerce Group 1', 'Business application development', '550e8400-e29b-41d4-a716-446655440003', 5, false, NOW(), NOW())
ON CONFLICT (class_id, group_name) DO UPDATE SET
  description = EXCLUDED.description,
  leader_id = EXCLUDED.leader_id,
  max_members = EXCLUDED.max_members,
  updated_at = NOW();

-- 6. Insert Group Members
INSERT INTO group_members (id, group_id, user_id, joined_at) VALUES
('gm-001', 'group-001', '550e8400-e29b-41d4-a716-446655440001', NOW()),
('gm-002', 'group-001', '550e8400-e29b-41d4-a716-446655440002', NOW()),
('gm-003', 'group-002', '550e8400-e29b-41d4-a716-446655440003', NOW()),
('gm-004', 'group-002', '550e8400-e29b-41d4-a716-446655440004', NOW()),
('gm-005', 'group-003', '550e8400-e29b-41d4-a716-446655440005', NOW())
ON CONFLICT (group_id, user_id) DO UPDATE SET
  joined_at = EXCLUDED.joined_at;

-- 7. Insert Assignments
INSERT INTO assignments (id, title, description, file_path, status, created_by, created_at, updated_at) VALUES
('assign-001', 'Database Design Project', 'Design and implement a relational database for a library management system', '/uploads/assignments/db-design-project.pdf', 'published', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', NOW(), NOW()),
('assign-002', 'Web Development Assignment', 'Create a responsive web application using React and Node.js', '/uploads/assignments/web-dev-assignment.pdf', 'published', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', NOW(), NOW()),
('assign-003', 'Network Security Lab', 'Implement basic network security protocols and analyze vulnerabilities', '/uploads/assignments/network-security.pdf', 'draft', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', NOW(), NOW())
ON CONFLICT (title) DO UPDATE SET
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = NOW();

-- 8. Insert Assignment Distributions
INSERT INTO assignment_distributions (id, assignment_id, assignee_type, assignee_id, scheduled_date, deadline, status, created_at) VALUES
('dist-001', 'assign-001', 'group', 'group-001', NOW() + INTERVAL '1 day', NOW() + INTERVAL '8 days', 'assigned', NOW()),
('dist-002', 'assign-001', 'group', 'group-002', NOW() + INTERVAL '1 day', NOW() + INTERVAL '8 days', 'assigned', NOW()),
('dist-003', 'assign-002', 'individual', '550e8400-e29b-41d4-a716-446655440001', NOW() + INTERVAL '2 days', NOW() + INTERVAL '9 days', 'assigned', NOW()),
('dist-004', 'assign-002', 'individual', '550e8400-e29b-41d4-a716-446655440002', NOW() + INTERVAL '2 days', NOW() + INTERVAL '9 days', 'assigned', NOW())
ON CONFLICT (assignment_id, assignee_type, assignee_id) DO UPDATE SET
  scheduled_date = EXCLUDED.scheduled_date,
  deadline = EXCLUDED.deadline,
  status = EXCLUDED.status;

-- 9. Insert Sample Submissions
INSERT INTO submissions (id, assignment_distribution_id, user_id, file_path, submitted_at, status, created_at) VALUES
('sub-001', 'dist-001', '550e8400-e29b-41d4-a716-446655440001', '/uploads/submissions/alice-db-project.zip', NOW() - INTERVAL '1 day', 'submitted', NOW() - INTERVAL '1 day'),
('sub-002', 'dist-003', '550e8400-e29b-41d4-a716-446655440001', '/uploads/submissions/alice-web-app.zip', NOW() - INTERVAL '2 hours', 'submitted', NOW() - INTERVAL '2 hours'),
('sub-003', 'dist-004', '550e8400-e29b-41d4-a716-446655440002', '/uploads/submissions/bob-web-app.zip', NOW() - INTERVAL '3 hours', 'submitted', NOW() - INTERVAL '3 hours')
ON CONFLICT (assignment_distribution_id, user_id) DO UPDATE SET
  file_path = EXCLUDED.file_path,
  submitted_at = EXCLUDED.submitted_at,
  status = EXCLUDED.status;

-- 10. Insert Sample Grades
INSERT INTO grades (id, submission_id, graded_by, score, max_score, feedback, graded_at, created_at) VALUES
('grade-001', 'sub-001', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 85, 100, 'Excellent database design with proper normalization. Minor issues with indexing strategy.', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'),
('grade-002', 'sub-002', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 92, 100, 'Outstanding web application with clean code and responsive design. Great use of React hooks.', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour')
ON CONFLICT (submission_id) DO UPDATE SET
  score = EXCLUDED.score,
  max_score = EXCLUDED.max_score,
  feedback = EXCLUDED.feedback,
  graded_at = EXCLUDED.graded_at;

-- 11. Insert Sample Schedules
INSERT INTO schedules (id, title, description, scheduled_date, start_time, end_time, lab_id, class_id, instructor_id, status, created_at) VALUES
('sched-001', 'Database Design Lab Session', 'Hands-on database design and implementation', CURRENT_DATE + INTERVAL '1 day', '09:00:00', '11:00:00', 'lab-001', 'class-001', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'scheduled', NOW()),
('sched-002', 'Web Development Workshop', 'React and Node.js development workshop', CURRENT_DATE + INTERVAL '2 days', '14:00:00', '16:00:00', 'lab-002', 'class-001', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'scheduled', NOW()),
('sched-003', 'Network Security Practical', 'Network security implementation and testing', CURRENT_DATE + INTERVAL '3 days', '10:00:00', '12:00:00', 'lab-003', 'class-002', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'scheduled', NOW())
ON CONFLICT (title, scheduled_date) DO UPDATE SET
  description = EXCLUDED.description,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  status = EXCLUDED.status;

-- Update password hashes with properly hashed 'admin123' password
-- Note: You should replace these with actual bcrypt hashes
UPDATE users SET password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' WHERE email IN ('admin@labsyncpro.com', 'instructor@labsyncpro.com');
UPDATE users SET password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' WHERE role = 'student';

-- Verify data insertion
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
SELECT 'Group Members', COUNT(*) FROM group_members
UNION ALL
SELECT 'Assignments', COUNT(*) FROM assignments
UNION ALL
SELECT 'Assignment Distributions', COUNT(*) FROM assignment_distributions
UNION ALL
SELECT 'Submissions', COUNT(*) FROM submissions
UNION ALL
SELECT 'Grades', COUNT(*) FROM grades
UNION ALL
SELECT 'Schedules', COUNT(*) FROM schedules;
