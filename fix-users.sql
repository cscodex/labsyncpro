-- Fix missing test users for LabSyncPro
-- This script adds the missing admin and instructor accounts

-- First, let's check if the admin user exists and update it
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) VALUES
('admin@labsyncpro.com', '$2b$10$7VaaPaMnnGCExmZN.dQZ2.yA7HShFLNRXvtMhvMdKjv1122g36wzy', 'System', 'Administrator', 'admin', true)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    is_active = true;

-- Add instructor test account
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) VALUES
('instructor@labsyncpro.com', '$2b$10$7VaaPaMnnGCExmZN.dQZ2.yA7HShFLNRXvtMhvMdKjv1122g36wzy', 'Test', 'Instructor', 'instructor', true)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    is_active = true;

-- Add student test account
INSERT INTO users (student_id, email, password_hash, first_name, last_name, role, is_active) VALUES
('20240999', 'student@labsyncpro.com', '$2b$10$7VaaPaMnnGCExmZN.dQZ2.yA7HShFLNRXvtMhvMdKjv1122g36wzy', 'Test', 'Student', 'student', true)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    is_active = true;

-- Verify the users were created
SELECT email, first_name, last_name, role, is_active FROM users 
WHERE email IN ('admin@labsyncpro.com', 'instructor@labsyncpro.com', 'student@labsyncpro.com');
