import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import { authAPI } from '../../services/api';
import PasswordInput from '../common/PasswordInput';
import './Auth.css';

const PasswordReset: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  
  const token = searchParams.get('token');
  const isResetMode = !!token;

  const [formData, setFormData] = useState({
    email: '',
    message: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      showError('Validation Error', 'Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      await authAPI.requestPasswordReset(formData.email, formData.message);
      showSuccess(
        'Request Sent to Administrator',
        'Your password reset request has been sent to the administrator. You will be contacted through alternative means (phone, in-person, etc.) with your new password.'
      );
      setFormData({ email: '', message: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      showError('Request Failed', error.response?.data?.error || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.newPassword || !formData.confirmPassword) {
      showError('Validation Error', 'Please fill in all fields');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showError('Password Mismatch', 'Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      showError('Invalid Password', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword({
        token: token!,
        newPassword: formData.newPassword
      });
      
      showSuccess(
        'Password Reset Successful', 
        'Your password has been reset. You can now log in with your new password.'
      );
      
      navigate('/login');
    } catch (error: any) {
      showError('Reset Failed', error.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>LabSyncPro</h1>
          <h2>{isResetMode ? 'Reset Password' : 'Forgot Password'}</h2>
          <p>
            {isResetMode
              ? 'Enter your new password below.'
              : 'Enter your email address and an optional message. Your request will be sent to the administrator who will contact you through alternative means.'
            }
          </p>
        </div>

        <form onSubmit={isResetMode ? handleResetPassword : handleRequestReset} className="auth-form">
          {!isResetMode ? (
            <>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email address"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message (Optional)</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Explain why you need a password reset (optional)"
                  rows={3}
                  maxLength={500}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  This message will be sent to the administrator along with your request.
                </small>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  placeholder="Enter your new password"
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Confirm your new password"
                  minLength={6}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading 
              ? (isResetMode ? 'Resetting Password...' : 'Sending Reset Link...') 
              : (isResetMode ? 'Reset Password' : 'Send Reset Link')
            }
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Remember your password? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;
