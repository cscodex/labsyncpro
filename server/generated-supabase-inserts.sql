
-- Insert Users
INSERT INTO users (id, email, password_hash, first_name, last_name, role, student_id, is_active, created_at, updated_at) VALUES
('38588c11-a71d-4730-8278-c2efb1cb4436', 'admin@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System', 'Administrator', 'admin', NULL, true, NOW(), NOW()),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'instructor@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Instructor', 'instructor', NULL, true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();