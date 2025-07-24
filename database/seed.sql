-- LabSyncPro Seed Data
-- Initial data for development and testing

-- Insert Labs
INSERT INTO labs (lab_name, lab_code, total_computers, total_seats, description) VALUES
('Lab 1', 'CL1', 15, 50, 'Computer Lab 1 with 15 computers and 50 seats'),
('Lab 2', 'CL2', 19, 50, 'Computer Lab 2 with 19 computers and 50 seats');

-- Get lab IDs for reference
DO $$
DECLARE
    lab1_id UUID;
    lab2_id UUID;
    class_id UUID;
    instructor_id UUID;
    student_id UUID;
    group_id UUID;
    i INTEGER;
BEGIN
    -- Get lab IDs
    SELECT id INTO lab1_id FROM labs WHERE lab_code = 'CL1';
    SELECT id INTO lab2_id FROM labs WHERE lab_code = 'CL2';

    -- Insert Computers for Lab 1 (CL1-PC-001 to CL1-PC-015)
    FOR i IN 1..15 LOOP
        INSERT INTO computers (lab_id, computer_name, computer_number, specifications, is_functional)
        VALUES (
            lab1_id,
            'CL1-PC-' || LPAD(i::text, 3, '0'),
            i,
            '{"cpu": "Intel i5", "ram": "8GB", "storage": "256GB SSD", "os": "Windows 11"}',
            true
        );
    END LOOP;

    -- Insert Computers for Lab 2 (CL2-PC-001 to CL2-PC-019)
    FOR i IN 1..19 LOOP
        INSERT INTO computers (lab_id, computer_name, computer_number, specifications, is_functional)
        VALUES (
            lab2_id,
            'CL2-PC-' || LPAD(i::text, 3, '0'),
            i,
            '{"cpu": "Intel i5", "ram": "8GB", "storage": "256GB SSD", "os": "Windows 11"}',
            true
        );
    END LOOP;

    -- Insert Seats for Lab 1 (50 seats)
    FOR i IN 1..50 LOOP
        INSERT INTO seats (lab_id, seat_number, is_available)
        VALUES (lab1_id, i, true);
    END LOOP;

    -- Insert Seats for Lab 2 (50 seats)
    FOR i IN 1..50 LOOP
        INSERT INTO seats (lab_id, seat_number, is_available)
        VALUES (lab2_id, i, true);
    END LOOP;
END $$;

-- Insert Classes
INSERT INTO classes (class_code, grade, stream, section, description) VALUES
-- Grade 11 Non-Medical (6 classes)
('11 NM A', 11, 'NM', 'A', 'Grade 11 Non-Medical Section A'),
('11 NM B', 11, 'NM', 'B', 'Grade 11 Non-Medical Section B'),
('11 NM C', 11, 'NM', 'C', 'Grade 11 Non-Medical Section C'),
('11 NM D', 11, 'NM', 'D', 'Grade 11 Non-Medical Section D'),
('11 NM E', 11, 'NM', 'E', 'Grade 11 Non-Medical Section E'),
('11 NM F', 11, 'NM', 'F', 'Grade 11 Non-Medical Section F'),

-- Grade 11 Medical (1 class)
('11 M A', 11, 'M', 'A', 'Grade 11 Medical Section A'),

-- Grade 11 Commerce (1 class)
('11 COM A', 11, 'COM', 'A', 'Grade 11 Commerce Section A'),

-- Grade 12 Medical (1 class)
('12 M A', 12, 'M', 'A', 'Grade 12 Medical Section A'),

-- Grade 12 Commerce (1 class)
('12 COM A', 12, 'COM', 'A', 'Grade 12 Commerce Section A');

-- Insert Sample Users
-- Admin user
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('admin@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System', 'Administrator', 'admin');

-- Sample Instructors
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('john.doe@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Doe', 'instructor'),
('jane.smith@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane', 'Smith', 'instructor'),
('mike.wilson@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mike', 'Wilson', 'instructor');

-- Sample Students with 8-digit student IDs
INSERT INTO users (student_id, email, password_hash, first_name, last_name, role) VALUES
('20240001', 'student1@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alice', 'Johnson', 'student'),
('20240002', 'student2@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Bob', 'Brown', 'student'),
('20240003', 'student3@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carol', 'Davis', 'student'),
('20240004', 'student4@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'David', 'Miller', 'student'),
('20240005', 'student5@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Eva', 'Garcia', 'student'),
('20240006', 'student6@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Frank', 'Martinez', 'student'),
('20240007', 'student7@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Grace', 'Anderson', 'student'),
('20240008', 'student8@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Henry', 'Taylor', 'student'),
('20240009', 'student9@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ivy', 'Thomas', 'student'),
('20240010', 'student10@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jack', 'Jackson', 'student'),
('20240011', 'student11@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Kate', 'White', 'student'),
('20240012', 'student12@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Liam', 'Harris', 'student');

-- Create sample groups
DO $$
DECLARE
    class_11_nm_a_id UUID;
    student1_id UUID;
    student2_id UUID;
    student3_id UUID;
    student4_id UUID;
    group1_id UUID;
    group2_id UUID;
    group3_id UUID;
BEGIN
    -- Get class ID for 11 NM A
    SELECT id INTO class_11_nm_a_id FROM classes WHERE class_code = '11 NM A';
    
    -- Get student IDs
    SELECT id INTO student1_id FROM users WHERE student_id = '20240001';
    SELECT id INTO student2_id FROM users WHERE student_id = '20240002';
    SELECT id INTO student3_id FROM users WHERE student_id = '20240003';
    SELECT id INTO student4_id FROM users WHERE student_id = '20240004';

    -- Create groups
    INSERT INTO groups (group_name, class_id, created_by) VALUES
    ('Group Alpha', class_11_nm_a_id, student1_id) RETURNING id INTO group1_id;
    
    INSERT INTO groups (group_name, class_id, created_by) VALUES
    ('Group Beta', class_11_nm_a_id, student2_id) RETURNING id INTO group2_id;
    
    INSERT INTO groups (group_name, class_id, created_by) VALUES
    ('Group Gamma', class_11_nm_a_id, student3_id) RETURNING id INTO group3_id;

    -- Add members to groups
    INSERT INTO group_members (group_id, user_id, role) VALUES
    (group1_id, student1_id, 'leader'),
    (group1_id, student2_id, 'member'),
    (group1_id, student3_id, 'member'),
    (group1_id, student4_id, 'member');

    INSERT INTO group_members (group_id, user_id, role) VALUES
    (group2_id, student2_id, 'leader');

    INSERT INTO group_members (group_id, user_id, role) VALUES
    (group3_id, student3_id, 'leader');
END $$;

-- Note: Password for all sample users is 'password123'
-- In production, use proper password hashing and secure passwords
