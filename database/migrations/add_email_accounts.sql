-- Email Accounts Management Migration
-- This creates tables for managing local email accounts

-- Create email_accounts table
CREATE TABLE IF NOT EXISTS email_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    quota_mb INTEGER DEFAULT 1024, -- 1GB default quota
    used_quota_mb INTEGER DEFAULT 0,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for email_accounts
CREATE INDEX IF NOT EXISTS idx_email_accounts_email ON email_accounts(email);
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_active ON email_accounts(is_active) WHERE deleted_at IS NULL;

-- Create email_aliases table for email forwarding
CREATE TABLE IF NOT EXISTS email_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alias_email VARCHAR(255) NOT NULL,
    target_email VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for email_aliases
CREATE INDEX IF NOT EXISTS idx_email_aliases_alias ON email_aliases(alias_email);
CREATE INDEX IF NOT EXISTS idx_email_aliases_target ON email_aliases(target_email);
CREATE INDEX IF NOT EXISTS idx_email_aliases_active ON email_aliases(is_active) WHERE deleted_at IS NULL;

-- Create email_templates table for system emails
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_key VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB DEFAULT '[]', -- Array of variable names used in template
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for email_templates
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

-- Create email_logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_email VARCHAR(255) NOT NULL,
    to_email VARCHAR(255) NOT NULL,
    cc_email TEXT,
    bcc_email TEXT,
    subject VARCHAR(255) NOT NULL,
    template_key VARCHAR(100),
    message_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'sent', -- sent, failed, bounced, delivered
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_from_email ON email_logs(from_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template_key);

-- Insert default email templates
INSERT INTO email_templates (template_key, subject, html_content, text_content, variables) VALUES
('welcome', 'Welcome to LabSyncPro', 
 '<h1>Welcome {{firstName}}!</h1><p>Your LabSyncPro account has been created.</p><p>Email: {{email}}</p><p>Temporary Password: {{tempPassword}}</p><p>Please change your password after first login.</p>',
 'Welcome {{firstName}}! Your LabSyncPro account has been created. Email: {{email}} Temporary Password: {{tempPassword}} Please change your password after first login.',
 '["firstName", "email", "tempPassword"]'),

('password_reset', 'Password Reset Request', 
 '<h1>Password Reset</h1><p>Hello {{firstName}},</p><p>A password reset was requested for your account.</p><p>Reset Token: {{resetToken}}</p><p>Please contact your administrator to complete the reset.</p>',
 'Hello {{firstName}}, A password reset was requested for your account. Reset Token: {{resetToken}} Please contact your administrator to complete the reset.',
 '["firstName", "resetToken"]'),

('assignment_notification', 'New Assignment: {{assignmentTitle}}',
 '<h1>New Assignment</h1><p>Hello {{studentName}},</p><p>A new assignment has been assigned to you:</p><p><strong>{{assignmentTitle}}</strong></p><p>Due Date: {{dueDate}}</p><p>Class: {{className}}</p>',
 'Hello {{studentName}}, A new assignment has been assigned to you: {{assignmentTitle}} Due Date: {{dueDate}} Class: {{className}}',
 '["studentName", "assignmentTitle", "dueDate", "className"]'),

('grade_notification', 'Grade Posted: {{assignmentTitle}}',
 '<h1>Grade Posted</h1><p>Hello {{studentName}},</p><p>Your grade for {{assignmentTitle}} has been posted.</p><p>Grade: {{grade}}/{{maxGrade}}</p><p>Feedback: {{feedback}}</p>',
 'Hello {{studentName}}, Your grade for {{assignmentTitle}} has been posted. Grade: {{grade}}/{{maxGrade}} Feedback: {{feedback}}',
 '["studentName", "assignmentTitle", "grade", "maxGrade", "feedback"]')

ON CONFLICT (template_key) DO NOTHING;

-- Create function to automatically create email account for new users
CREATE OR REPLACE FUNCTION create_user_email_account()
RETURNS TRIGGER AS $$
DECLARE
    email_address VARCHAR(255);
BEGIN
    -- Generate email address based on user info
    email_address := LOWER(NEW.first_name || '.' || NEW.last_name || '@labsync.local');
    
    -- Remove any special characters and spaces
    email_address := REGEXP_REPLACE(email_address, '[^a-z0-9.@]', '', 'g');
    
    -- Insert email account
    INSERT INTO email_accounts (email, first_name, last_name, user_id)
    VALUES (email_address, NEW.first_name, NEW.last_name, NEW.id)
    ON CONFLICT (email) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create email accounts
DROP TRIGGER IF EXISTS trigger_create_user_email_account ON users;
CREATE TRIGGER trigger_create_user_email_account
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_email_account();

-- Create function to log email sends
CREATE OR REPLACE FUNCTION log_email_send(
    p_from_email VARCHAR(255),
    p_to_email VARCHAR(255),
    p_subject VARCHAR(255),
    p_template_key VARCHAR(100) DEFAULT NULL,
    p_message_id VARCHAR(255) DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT 'sent',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO email_logs (
        from_email, to_email, subject, template_key, 
        message_id, status, metadata
    ) VALUES (
        p_from_email, p_to_email, p_subject, p_template_key,
        p_message_id, p_status, p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get email template with variable substitution
CREATE OR REPLACE FUNCTION get_email_template(
    p_template_key VARCHAR(100),
    p_variables JSONB DEFAULT '{}'
)
RETURNS TABLE(subject TEXT, html_content TEXT, text_content TEXT) AS $$
DECLARE
    template_record RECORD;
    final_subject TEXT;
    final_html TEXT;
    final_text TEXT;
    var_key TEXT;
    var_value TEXT;
BEGIN
    -- Get template
    SELECT et.subject, et.html_content, et.text_content
    INTO template_record
    FROM email_templates et
    WHERE et.template_key = p_template_key AND et.is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Email template not found: %', p_template_key;
    END IF;
    
    -- Start with original content
    final_subject := template_record.subject;
    final_html := template_record.html_content;
    final_text := template_record.text_content;
    
    -- Replace variables
    FOR var_key, var_value IN SELECT * FROM jsonb_each_text(p_variables)
    LOOP
        final_subject := REPLACE(final_subject, '{{' || var_key || '}}', var_value);
        final_html := REPLACE(final_html, '{{' || var_key || '}}', var_value);
        final_text := REPLACE(final_text, '{{' || var_key || '}}', var_value);
    END LOOP;
    
    RETURN QUERY SELECT final_subject, final_html, final_text;
END;
$$ LANGUAGE plpgsql;

-- Create view for email account statistics
CREATE OR REPLACE VIEW email_account_stats AS
SELECT 
    COUNT(*) as total_accounts,
    COUNT(*) FILTER (WHERE is_active = true) as active_accounts,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_accounts,
    AVG(quota_mb) as avg_quota_mb,
    SUM(used_quota_mb) as total_used_mb,
    COUNT(*) FILTER (WHERE last_login >= CURRENT_DATE - INTERVAL '30 days') as active_last_30_days
FROM email_accounts;

-- Create function to cleanup old email logs
CREATE OR REPLACE FUNCTION cleanup_old_email_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM email_logs 
    WHERE sent_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_accounts_updated_at
    BEFORE UPDATE ON email_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_email_accounts_updated_at();

CREATE TRIGGER update_email_aliases_updated_at
    BEFORE UPDATE ON email_aliases
    FOR EACH ROW
    EXECUTE FUNCTION update_email_accounts_updated_at();
