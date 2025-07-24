import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

interface PasswordResetRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  message: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  status: 'pending' | 'completed' | 'rejected';
  completed_by_name?: string;
  completed_by_lastname?: string;
}

const PasswordResetRequests: React.FC = () => {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5002/api/password-reset-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      } else {
        showError('Failed to fetch password reset requests');
      }
    } catch (error) {
      console.error('Error fetching password reset requests:', error);
      showError('Failed to fetch password reset requests');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (request: PasswordResetRequest) => {
    setSelectedRequest(request);
    setShowPasswordModal(true);
  };

  const confirmPasswordReset = async () => {
    if (!selectedRequest || !newPassword) {
      showError('Please enter a new password');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5002/api/password-reset-requests/${selectedRequest.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess(
          'Password Reset Successful',
          `New password set for ${selectedRequest.user_name}. Please communicate this password through secure means.`
        );

        // Refresh the requests list
        fetchRequests();

        setShowPasswordModal(false);
        setNewPassword('');
        setSelectedRequest(null);
      } else {
        const error = await response.json();
        showError(`Failed to reset password: ${error.error}`);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      showError('Failed to reset password');
    }
  };

  const markAsRejected = async (requestId: string) => {
    try {
      const response = await fetch(`http://localhost:5002/api/password-reset-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showSuccess('Request marked as rejected');
        fetchRequests(); // Refresh the list
      } else {
        const error = await response.json();
        showError(`Failed to reject request: ${error.error}`);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      showError('Failed to reject request');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'completed': return '#28a745';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>Only administrators can view password reset requests.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>🔐 Password Reset Requests</h2>
        <button
          onClick={fetchRequests}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      <div style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>📋 Instructions for Admins:</h3>
        <ol>
          <li><strong>Verify Identity:</strong> Contact the user through alternative means (phone, in-person) to confirm their identity</li>
          <li><strong>Reset Password:</strong> Click "Reset Password" to generate a new temporary password</li>
          <li><strong>Secure Communication:</strong> Share the new password through secure channels (NOT email)</li>
          <li><strong>User Instructions:</strong> Tell the user to change their password after first login</li>
        </ol>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>User</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Message</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Request Time</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    No password reset requests found
                  </td>
                </tr>
              ) : (
                requests.map(request => (
                  <tr key={request.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{request.user_name}</td>
                    <td style={{ padding: '12px' }}>{request.user_email}</td>
                    <td style={{ padding: '12px', maxWidth: '200px' }}>
                      {request.message ? (
                        <div style={{
                          backgroundColor: '#fff3cd',
                          padding: '8px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          "{request.message}"
                        </div>
                      ) : (
                        <span style={{ color: '#666', fontStyle: 'italic' }}>No message</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{formatDate(request.created_at)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: getStatusColor(request.status),
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        textTransform: 'uppercase'
                      }}>
                        {request.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {request.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleResetPassword(request)}
                            style={{
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            🔑 Reset Password
                          </button>
                          <button
                            onClick={() => markAsRejected(request.id)}
                            style={{
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#666', fontSize: '12px' }}>
                          {request.status === 'completed' ? '✅ Completed' : '❌ Rejected'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedRequest && (
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
            padding: '30px',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h3>🔑 Reset Password for {selectedRequest.userName}</h3>
            <p><strong>Email:</strong> {selectedRequest.userEmail}</p>
            {selectedRequest.message && (
              <div style={{ 
                backgroundColor: '#fff3cd', 
                padding: '10px', 
                borderRadius: '4px',
                marginBottom: '15px'
              }}>
                <strong>User Message:</strong> "{selectedRequest.message}"
              </div>
            )}
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                New Temporary Password:
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new temporary password"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                Generate a secure temporary password. User should change it after first login.
              </small>
            </div>

            <div style={{ 
              backgroundColor: '#f8d7da', 
              padding: '10px', 
              borderRadius: '4px',
              marginBottom: '20px',
              border: '1px solid #f5c6cb'
            }}>
              <strong>⚠️ Security Warning:</strong> Do NOT send this password via email. 
              Use secure communication methods like phone calls or in-person delivery.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setSelectedRequest(null);
                }}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmPasswordReset}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🔑 Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordResetRequests;
