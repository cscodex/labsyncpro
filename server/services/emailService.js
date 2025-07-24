const nodemailer = require('nodemailer');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const { query } = require('../config/database');

// Email configuration
const emailConfig = {
  // For MailHog (development)
  development: {
    host: 'localhost',
    port: 1025,
    secure: false,
    auth: false
  },
  
  // For Docker Mail Server (production)
  production: {
    host: 'localhost', // or your mail server IP
    port: 587,
    secure: false,
    auth: {
      user: 'admin@labsync.local',
      pass: 'admin123'
    }
  },
  
  // For external SMTP (Gmail, etc.)
  external: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  }
};

// Create transporter based on environment
const createTransporter = () => {
  const env = process.env.NODE_ENV || 'development';
  const config = emailConfig[env] || emailConfig.development;

  return nodemailer.createTransport(config);
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, firstName) => {
  const transporter = createTransporter();
  
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/password-reset?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.FROM_EMAIL || 'noreply@labsync.local',
    to: email,
    subject: 'LabSyncPro - Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LabSyncPro</h1>
            <h2>Password Reset Request</h2>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>We received a request to reset your password for your LabSyncPro account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">${resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>Best regards,<br>The LabSyncPro Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset request to admin
const sendPasswordResetRequestToAdmin = async (userEmail, userName, userMessage = '') => {
  const transporter = createTransporter();

  // Get admin email
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@labsyncpro.com';

  const mailOptions = {
    from: process.env.FROM_EMAIL || 'noreply@labsync.local',
    to: adminEmail,
    subject: `Password Reset Request from ${userName} - LabSyncPro`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .user-info { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .message-box { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107; }
          .instructions { background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #17a2b8; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>User Password Reset Request</h2>
            <p>A user has requested a password reset for their LabSyncPro account.</p>

            <div class="user-info">
              <h3>👤 User Information:</h3>
              <p><strong>Name:</strong> ${userName}</p>
              <p><strong>Email:</strong> ${userEmail}</p>
              <p><strong>Request Time:</strong> ${new Date().toLocaleString()}</p>
            </div>

            ${userMessage ? `
            <div class="message-box">
              <h3>💬 User Message:</h3>
              <p>"${userMessage}"</p>
            </div>
            ` : ''}

            <div class="instructions">
              <h3>📋 Next Steps:</h3>
              <ol>
                <li><strong>Verify the user's identity</strong> through alternative means (phone, in-person, etc.)</li>
                <li><strong>Login to LabSyncPro admin panel</strong> to reset their password</li>
                <li><strong>Generate a new temporary password</strong> for the user</li>
                <li><strong>Communicate the new password</strong> to the user through secure means:
                  <ul>
                    <li>Phone call</li>
                    <li>In-person meeting</li>
                    <li>Secure messaging system</li>
                    <li>Physical note delivery</li>
                  </ul>
                </li>
                <li><strong>Instruct the user</strong> to change the password after first login</li>
              </ol>
            </div>

            <p><strong>⚠️ Security Note:</strong> Do not send the new password via email or unsecured channels.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from LabSyncPro Password Reset System.</p>
            <p>Admin Panel: <a href="http://localhost:5174/users">http://localhost:5174/users</a></p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset request sent to admin:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset request to admin:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email for new users
const sendWelcomeEmail = async (email, firstName, tempPassword, mailAddress = null) => {
  const transporter = createTransporter();
  
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/login`;
  
  const mailOptions = {
    from: process.env.FROM_EMAIL || 'noreply@labsync.local',
    to: email,
    subject: 'Welcome to LabSyncPro',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .credentials { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LabSyncPro</h1>
            <h2>Welcome to LabSyncPro!</h2>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>Your LabSyncPro account has been created successfully!</p>
            <div class="credentials">
              <h3>Your LabSyncPro Login Credentials:</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary Password:</strong> ${tempPassword}</p>
            </div>
            ${mailAddress ? `
            <div class="credentials">
              <h3>Your Email Account:</h3>
              <p><strong>Email Address:</strong> ${mailAddress}</p>
              <p><strong>Temporary Password:</strong> ${tempPassword}</p>
              <p><strong>Webmail Access:</strong> <a href="http://localhost:8080">http://localhost:8080</a></p>
              <p><strong>IMAP Server:</strong> localhost:143</p>
              <p><strong>SMTP Server:</strong> localhost:587</p>
            </div>
            ` : ''}
            <p><strong>Important:</strong> Please change your passwords after your first login for security.</p>
            <a href="${loginUrl}" class="button">Login to LabSyncPro</a>
            <p>If you have any questions, please contact your administrator.</p>
            <p>Best regards,<br>The LabSyncPro Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

// Test email connection
const testEmailConnection = async () => {
  const transporter = createTransporter();

  try {
    await transporter.verify();
    console.log('Email server connection successful');
    return { success: true };
  } catch (error) {
    console.error('Email server connection failed:', error);
    return { success: false, error: error.message };
  }
};

// Create email account on mail server
const createEmailAccount = async (email, password) => {
  try {
    const command = `docker exec labsync-mailserver setup email add "${email}" "${password}"`;
    await execAsync(command);
    console.log(`Email account created: ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to create email account for ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Delete email account from mail server
const deleteEmailAccount = async (email) => {
  try {
    const command = `docker exec labsync-mailserver setup email del "${email}"`;
    await execAsync(command);
    console.log(`Email account deleted: ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to delete email account for ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Change email account password
const changeEmailPassword = async (email, newPassword) => {
  try {
    const command = `docker exec labsync-mailserver setup email update "${email}" "${newPassword}"`;
    await execAsync(command);
    console.log(`Password changed for email account: ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to change password for ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Generate email address from user data
const generateEmailAddress = (firstName, lastName, studentId = null) => {
  const domain = process.env.MAIL_DOMAIN || 'labsync.local';

  if (studentId) {
    // For students: use student ID
    return `${studentId.toLowerCase()}@${domain}`;
  } else {
    // For staff: use first.last format
    const first = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const last = lastName.toLowerCase().replace(/[^a-z]/g, '');
    return `${first}.${last}@${domain}`;
  }
};

// Enhanced Mail Server Management

/**
 * Setup local mail server with Docker
 */
const setupLocalMailServer = async () => {
  try {
    console.log('Setting up local mail server...');

    // Create docker-compose.yml for mail server
    const dockerComposeContent = `
version: '3.8'
services:
  mailserver:
    image: docker.io/mailserver/docker-mailserver:latest
    container_name: labsyncpro-mailserver
    hostname: mail.labsync.local
    ports:
      - "25:25"    # SMTP
      - "143:143"  # IMAP
      - "587:587"  # SMTP Submission
      - "993:993"  # IMAPS
    volumes:
      - ./docker-data/dms/mail-data/:/var/mail/
      - ./docker-data/dms/mail-state/:/var/mail-state/
      - ./docker-data/dms/mail-logs/:/var/log/mail/
      - ./docker-data/dms/config/:/tmp/docker-mailserver/
      - /etc/localtime:/etc/localtime:ro
    environment:
      - ENABLE_RSPAMD=1
      - ENABLE_CLAMAV=1
      - ENABLE_FAIL2BAN=1
      - ENABLE_POSTGREY=1
      - ENABLE_MANAGESIEVE=1
      - ONE_DIR=1
      - ENABLE_UPDATE_CHECK=1
      - UPDATE_CHECK_INTERVAL=1d
      - PERMIT_DOCKER=none
      - SSL_TYPE=self-signed
      - SPOOF_PROTECTION=1
      - ENABLE_SRS=1
    cap_add:
      - NET_ADMIN
      - SYS_PTRACE
    restart: always

  webmail:
    image: roundcube/roundcubemail:latest
    container_name: labsyncpro-webmail
    ports:
      - "8080:80"
    environment:
      - ROUNDCUBEMAIL_DB_TYPE=sqlite
      - ROUNDCUBEMAIL_SKIN=elastic
      - ROUNDCUBEMAIL_DEFAULT_HOST=mailserver
      - ROUNDCUBEMAIL_SMTP_SERVER=mailserver
    volumes:
      - ./docker-data/roundcube:/var/roundcube/db
    depends_on:
      - mailserver
    restart: always
`;

    // Write docker-compose file
    const dockerDir = path.join(process.cwd(), 'docker-mail');
    await fs.mkdir(dockerDir, { recursive: true });
    await fs.writeFile(path.join(dockerDir, 'docker-compose.yml'), dockerComposeContent);

    // Create necessary directories
    const dataDir = path.join(dockerDir, 'docker-data');
    await fs.mkdir(path.join(dataDir, 'dms', 'mail-data'), { recursive: true });
    await fs.mkdir(path.join(dataDir, 'dms', 'mail-state'), { recursive: true });
    await fs.mkdir(path.join(dataDir, 'dms', 'mail-logs'), { recursive: true });
    await fs.mkdir(path.join(dataDir, 'dms', 'config'), { recursive: true });
    await fs.mkdir(path.join(dataDir, 'roundcube'), { recursive: true });

    console.log('Mail server configuration created. Run "docker-compose up -d" in the docker-mail directory to start.');

    return {
      success: true,
      message: 'Mail server configuration created',
      dockerDir,
      webmailUrl: 'http://localhost:8080'
    };
  } catch (error) {
    console.error('Failed to setup local mail server:', error);
    throw error;
  }
};

/**
 * Check mail server status
 */
const checkMailServerStatus = async () => {
  try {
    // Check if containers are running
    const { stdout } = await execAsync('docker ps --filter name=labsyncpro-mailserver --format "{{.Status}}"');
    const mailserverRunning = stdout.trim().includes('Up');

    const { stdout: webmailStdout } = await execAsync('docker ps --filter name=labsyncpro-webmail --format "{{.Status}}"');
    const webmailRunning = webmailStdout.trim().includes('Up');

    return {
      mailserver: {
        running: mailserverRunning,
        status: mailserverRunning ? 'running' : 'stopped'
      },
      webmail: {
        running: webmailRunning,
        status: webmailRunning ? 'running' : 'stopped',
        url: webmailRunning ? 'http://localhost:8080' : null
      },
      overall: mailserverRunning && webmailRunning ? 'healthy' : 'unhealthy'
    };
  } catch (error) {
    console.error('Failed to check mail server status:', error);
    return {
      mailserver: { running: false, status: 'error' },
      webmail: { running: false, status: 'error' },
      overall: 'error',
      error: error.message
    };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetRequestToAdmin,
  sendWelcomeEmail,
  testEmailConnection,
  createEmailAccount,
  deleteEmailAccount,
  changeEmailPassword,
  generateEmailAddress,
  // Enhanced mail server functions
  setupLocalMailServer,
  checkMailServerStatus
};
