import React, { useState, useEffect } from 'react';
import LoadingSpinner from './common/LoadingSpinner';

interface Email {
  id: string;
  from: {
    email: string;
    name: string;
  };
  to: {
    email: string;
    name: string;
  };
  subject: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: string;
}

interface MailboxStats {
  inbox: { total: number; unread: number };
  sent: { total: number; unread: number };
  drafts: { total: number; unread: number };
  trash: { total: number; unread: number };
}

interface User {
  email: string;
  name: string;
  role: string;
}

const SimpleWebmail: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [stats, setStats] = useState<MailboxStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Compose form state
  const [composeForm, setComposeForm] = useState({
    to: '',
    subject: '',
    content: ''
  });

  const token = localStorage.getItem('token');

  const fetchEmails = async (folder: string = 'inbox') => {
    setLoading(true);
    try {
      const endpoint = folder === 'inbox' 
        ? '/api/webmail/inbox' 
        : `/api/webmail/folder/${folder}`;
      
      const response = await fetch(`http://localhost:5002${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails || []);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/webmail/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/webmail/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const sendEmail = async () => {
    if (!composeForm.to || !composeForm.subject || !composeForm.content) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:5002/api/webmail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(composeForm)
      });

      if (response.ok) {
        alert('Email sent successfully!');
        setShowCompose(false);
        setComposeForm({ to: '', subject: '', content: '' });
        fetchEmails(currentFolder);
        fetchStats();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    }
  };

  const markAsRead = async (emailId: string) => {
    try {
      await fetch(`http://localhost:5002/api/webmail/email/${emailId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update local state
      setEmails(emails.map(email => 
        email.id === emailId ? { ...email, read: true } : email
      ));
      fetchStats();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteEmail = async (emailId: string) => {
    if (!confirm('Are you sure you want to delete this email?')) return;

    try {
      const response = await fetch(`http://localhost:5002/api/webmail/email/${emailId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setEmails(emails.filter(email => email.id !== emailId));
        setSelectedEmail(null);
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting email:', error);
    }
  };

  const openEmail = async (email: Email) => {
    setSelectedEmail(email);
    if (!email.read) {
      await markAsRead(email.id);
    }
  };

  useEffect(() => {
    fetchEmails(currentFolder);
    fetchStats();
    fetchUsers();
  }, [currentFolder]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const folders = [
    { id: 'inbox', name: '📥 Inbox', count: stats?.inbox.unread || 0 },
    { id: 'sent', name: '📤 Sent', count: 0 },
    { id: 'drafts', name: '📝 Drafts', count: 0 },
    { id: 'trash', name: '🗑️ Trash', count: 0 }
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', backgroundColor: 'white', boxShadow: '2px 0 4px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
          <h2 style={{ margin: 0, color: '#333' }}>📧 Webmail</h2>
        </div>
        
        <div style={{ padding: '20px' }}>
          <button
            onClick={() => setShowCompose(true)}
            style={{
              width: '100%',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✏️ Compose
          </button>
        </div>

        <div style={{ padding: '0 20px' }}>
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => setCurrentFolder(folder.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px',
                border: 'none',
                backgroundColor: currentFolder === folder.id ? '#e3f2fd' : 'transparent',
                color: currentFolder === folder.id ? '#1976d2' : '#333',
                borderRadius: '6px',
                marginBottom: '8px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{folder.name}</span>
              {folder.count > 0 && (
                <span style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {folder.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid #eee', marginTop: '20px' }}>
          <button
            onClick={() => {
              fetchEmails(currentFolder);
              fetchStats();
            }}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: '1px solid #ddd',
              padding: '8px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Email List */}
        <div style={{ width: '50%', backgroundColor: 'white', borderRight: '1px solid #eee' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
            <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{currentFolder}</h3>
            {stats && (
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                {stats[currentFolder as keyof MailboxStats]?.total || 0} emails
                {stats[currentFolder as keyof MailboxStats]?.unread > 0 && 
                  ` (${stats[currentFolder as keyof MailboxStats]?.unread} unread)`
                }
              </p>
            )}
          </div>

          <div style={{ height: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            {loading ? (
              <LoadingSpinner size="medium" message="Loading emails..." />
            ) : emails.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                No emails in {currentFolder}
              </div>
            ) : (
              emails.map(email => (
                <div
                  key={email.id}
                  onClick={() => openEmail(email)}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    backgroundColor: selectedEmail?.id === email.id ? '#e3f2fd' : 
                                   !email.read ? '#f3f4f6' : 'white',
                    borderLeft: !email.read ? '4px solid #007bff' : '4px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedEmail?.id !== email.id) {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedEmail?.id !== email.id) {
                      e.currentTarget.style.backgroundColor = !email.read ? '#f3f4f6' : 'white';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 'bold', color: '#333' }}>
                      {currentFolder === 'sent' ? email.to.name : email.from.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {formatDate(email.timestamp)}
                    </div>
                  </div>
                  <div style={{ fontWeight: '500', color: '#555', marginBottom: '4px' }}>
                    {email.subject}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {email.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: email.type === 'system' ? '#e8f5e8' :
                                     email.type === 'notification' ? '#fff3cd' : '#e9ecef',
                      color: email.type === 'system' ? '#2e7d32' :
                             email.type === 'notification' ? '#856404' : '#495057'
                    }}>
                      {email.type}
                    </span>
                    {!email.read && (
                      <span style={{ color: '#007bff', fontSize: '12px' }}>● Unread</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Email Content */}
        <div style={{ width: '50%', backgroundColor: 'white' }}>
          {selectedEmail ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>{selectedEmail.subject}</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => deleteEmail(selectedEmail.id)}
                      style={{
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Delete
                    </button>
                    <button
                      onClick={() => setSelectedEmail(null)}
                      style={{
                        backgroundColor: '#666',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                  <strong>From:</strong> {selectedEmail.from.name} ({selectedEmail.from.email})
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                  <strong>To:</strong> {selectedEmail.to.name} ({selectedEmail.to.email})
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <strong>Date:</strong> {formatDate(selectedEmail.timestamp)}
                </div>
              </div>
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                <div dangerouslySetInnerHTML={{ __html: selectedEmail.content }} />
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📧</div>
                <p>Select an email to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Compose Email</h3>
              <button
                onClick={() => setShowCompose(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>To:</label>
                <select
                  value={composeForm.to}
                  onChange={(e) => setComposeForm({...composeForm, to: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="">Select recipient...</option>
                  {users.map(user => (
                    <option key={user.email} value={user.email}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Subject:</label>
                <input
                  type="text"
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm({...composeForm, subject: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                  placeholder="Enter subject..."
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Message:</label>
                <textarea
                  value={composeForm.content}
                  onChange={(e) => setComposeForm({...composeForm, content: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    height: '150px',
                    resize: 'vertical'
                  }}
                  placeholder="Enter your message..."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => setShowCompose(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={sendEmail}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  📤 Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleWebmail;
