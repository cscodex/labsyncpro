const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

// Mail storage directory
const MAIL_DIR = path.join(__dirname, '../mail-storage');

// Ensure mail directory exists
const ensureMailDir = async () => {
  try {
    await fs.access(MAIL_DIR);
  } catch {
    await fs.mkdir(MAIL_DIR, { recursive: true });
  }
};

// Get user's mailbox directory
const getUserMailboxDir = async (userId) => {
  await ensureMailDir();
  const userDir = path.join(MAIL_DIR, userId);
  
  try {
    await fs.access(userDir);
  } catch {
    await fs.mkdir(userDir, { recursive: true });
    // Create default folders
    await fs.mkdir(path.join(userDir, 'inbox'), { recursive: true });
    await fs.mkdir(path.join(userDir, 'sent'), { recursive: true });
    await fs.mkdir(path.join(userDir, 'drafts'), { recursive: true });
    await fs.mkdir(path.join(userDir, 'trash'), { recursive: true });
  }
  
  return userDir;
};

// Store email in user's mailbox
const storeEmail = async (userId, folder, emailData) => {
  const userDir = await getUserMailboxDir(userId);
  const folderDir = path.join(userDir, folder);
  
  // Ensure folder exists
  try {
    await fs.access(folderDir);
  } catch {
    await fs.mkdir(folderDir, { recursive: true });
  }
  
  const emailId = uuidv4();
  const emailFile = path.join(folderDir, `${emailId}.json`);
  
  const email = {
    id: emailId,
    ...emailData,
    timestamp: new Date().toISOString(),
    read: false
  };
  
  await fs.writeFile(emailFile, JSON.stringify(email, null, 2));
  return emailId;
};

// Get emails from user's folder
const getEmails = async (userId, folder = 'inbox', limit = 50) => {
  const userDir = await getUserMailboxDir(userId);
  const folderDir = path.join(userDir, folder);
  
  try {
    const files = await fs.readdir(folderDir);
    const emails = [];
    
    for (const file of files.slice(0, limit)) {
      if (file.endsWith('.json')) {
        const emailPath = path.join(folderDir, file);
        const emailData = await fs.readFile(emailPath, 'utf8');
        emails.push(JSON.parse(emailData));
      }
    }
    
    // Sort by timestamp (newest first)
    emails.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return emails;
  } catch (error) {
    console.error('Error reading emails:', error);
    return [];
  }
};

// Get specific email
const getEmail = async (userId, emailId) => {
  const userDir = await getUserMailboxDir(userId);
  const folders = ['inbox', 'sent', 'drafts', 'trash'];
  
  for (const folder of folders) {
    try {
      const emailPath = path.join(userDir, folder, `${emailId}.json`);
      const emailData = await fs.readFile(emailPath, 'utf8');
      return JSON.parse(emailData);
    } catch {
      // Continue to next folder
    }
  }
  
  return null;
};

// Mark email as read
const markAsRead = async (userId, emailId) => {
  const userDir = await getUserMailboxDir(userId);
  const folders = ['inbox', 'sent', 'drafts', 'trash'];
  
  for (const folder of folders) {
    try {
      const emailPath = path.join(userDir, folder, `${emailId}.json`);
      const emailData = await fs.readFile(emailPath, 'utf8');
      const email = JSON.parse(emailData);
      
      email.read = true;
      await fs.writeFile(emailPath, JSON.stringify(email, null, 2));
      return true;
    } catch {
      // Continue to next folder
    }
  }
  
  return false;
};

// Send email between users
const sendInternalEmail = async (fromUserId, toEmail, subject, content) => {
  try {
    // Get sender info
    const senderResult = await query(
      'SELECT email, first_name, last_name FROM users WHERE id = $1',
      [fromUserId]
    );
    
    if (senderResult.rows.length === 0) {
      throw new Error('Sender not found');
    }
    
    const sender = senderResult.rows[0];
    
    // Get recipient info
    const recipientResult = await query(
      'SELECT id, first_name, last_name FROM users WHERE email = $1',
      [toEmail]
    );
    
    if (recipientResult.rows.length === 0) {
      throw new Error('Recipient not found');
    }
    
    const recipient = recipientResult.rows[0];
    
    const emailData = {
      from: {
        email: sender.email,
        name: `${sender.first_name} ${sender.last_name}`
      },
      to: {
        email: toEmail,
        name: `${recipient.first_name} ${recipient.last_name}`
      },
      subject: subject,
      content: content,
      type: 'internal'
    };
    
    // Store in recipient's inbox
    const inboxId = await storeEmail(recipient.id, 'inbox', emailData);
    
    // Store in sender's sent folder
    const sentId = await storeEmail(fromUserId, 'sent', emailData);
    
    return { inboxId, sentId };
    
  } catch (error) {
    console.error('Error sending internal email:', error);
    throw error;
  }
};

// Delete email
const deleteEmail = async (userId, emailId) => {
  const userDir = await getUserMailboxDir(userId);
  const folders = ['inbox', 'sent', 'drafts', 'trash'];
  
  for (const folder of folders) {
    try {
      const emailPath = path.join(userDir, folder, `${emailId}.json`);
      await fs.unlink(emailPath);
      return true;
    } catch {
      // Continue to next folder
    }
  }
  
  return false;
};

// Get mailbox stats
const getMailboxStats = async (userId) => {
  const userDir = await getUserMailboxDir(userId);
  const folders = ['inbox', 'sent', 'drafts', 'trash'];
  const stats = {};
  
  for (const folder of folders) {
    try {
      const folderDir = path.join(userDir, folder);
      const files = await fs.readdir(folderDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      let unreadCount = 0;
      if (folder === 'inbox') {
        for (const file of jsonFiles) {
          const emailPath = path.join(folderDir, file);
          const emailData = await fs.readFile(emailPath, 'utf8');
          const email = JSON.parse(emailData);
          if (!email.read) unreadCount++;
        }
      }
      
      stats[folder] = {
        total: jsonFiles.length,
        unread: unreadCount
      };
    } catch {
      stats[folder] = { total: 0, unread: 0 };
    }
  }
  
  return stats;
};

module.exports = {
  storeEmail,
  getEmails,
  getEmail,
  markAsRead,
  sendInternalEmail,
  deleteEmail,
  getMailboxStats,
  getUserMailboxDir
};
