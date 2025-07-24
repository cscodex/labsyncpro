import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { authAPI, usersAPI } from '../../services/api';
import DatabaseSchemaModal from './DatabaseSchemaModal';
import './Profile.css';

interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  studentId?: string;
  isActive: boolean;
  createdAt: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);

  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    studentId: ''
  });

  const [passwordForm, setPasswordForm] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getProfile();
      const profile = response.data.user;
      setProfileData(profile);
      setEditForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        studentId: profile.studentId || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      showError('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (editing) {
      // Reset form to original values
      setEditForm({
        firstName: profileData?.firstName || '',
        lastName: profileData?.lastName || '',
        email: profileData?.email || '',
        studentId: profileData?.studentId || ''
      });
    }
    setEditing(!editing);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      if (!profileData) return;

      await usersAPI.updateUser(profileData.id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        ...(user?.role === 'student' && { studentId: editForm.studentId })
      });

      await fetchProfile(); // Refresh profile data
      setEditing(false);
      showSuccess('Profile Updated', 'Your profile has been updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showError('Update Failed', error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        showError('Password Mismatch', 'New passwords do not match');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        showError('Invalid Password', 'Password must be at least 6 characters long');
        return;
      }

      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      showSuccess('Password Changed', 'Your password has been changed successfully');
    } catch (error: any) {
      console.error('Error changing password:', error);
      showError('Password Change Failed', error.response?.data?.error || 'Failed to change password');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'instructor': return 'Instructor';
      case 'student': return 'Student';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">Loading profile...</div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="profile-container">
        <div className="error-message">Failed to load profile data</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>My Profile</h1>
        <div className="profile-actions">
          {user?.role === 'admin' && (
            <button
              className="btn btn-info"
              onClick={() => setShowSchemaModal(true)}
            >
              Database Schema
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => setShowPasswordModal(true)}
          >
            Change Password
          </button>
          <button
            className={`btn ${editing ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleEditToggle}
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-info">
            <div className="profile-avatar">
              <div className="avatar-circle">
                {profileData.firstName.charAt(0)}{profileData.lastName.charAt(0)}
              </div>
            </div>

            <div className="profile-details">
              <h2>{profileData.firstName} {profileData.lastName}</h2>
              <p className="role-badge">{getRoleDisplayName(profileData.role)}</p>
              {profileData.studentId && (
                <p className="student-id">Student ID: {profileData.studentId}</p>
              )}
              <p className="member-since">Member since {formatDate(profileData.createdAt)}</p>
            </div>
          </div>

          <div className="profile-form">
            <div className="form-section">
              <h3>Personal Information</h3>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  {editing ? (
                    <input
                      type="text"
                      id="firstName"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  ) : (
                    <div className="form-value">{profileData.firstName}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  {editing ? (
                    <input
                      type="text"
                      id="lastName"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  ) : (
                    <div className="form-value">{profileData.lastName}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  {editing ? (
                    <input
                      type="email"
                      id="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  ) : (
                    <div className="form-value">{profileData.email}</div>
                  )}
                </div>

                {user?.role === 'student' && (
                  <div className="form-group">
                    <label htmlFor="studentId">Student ID</label>
                    {editing ? (
                      <input
                        type="text"
                        id="studentId"
                        value={editForm.studentId}
                        onChange={(e) => setEditForm(prev => ({ ...prev, studentId: e.target.value }))}
                        maxLength={8}
                        placeholder="8-digit student ID"
                      />
                    ) : (
                      <div className="form-value">{profileData.studentId || 'Not set'}</div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label>Role</label>
                  <div className="form-value">{getRoleDisplayName(profileData.role)}</div>
                </div>

                <div className="form-group">
                  <label>Account Status</label>
                  <div className={`form-value status ${profileData.isActive ? 'active' : 'inactive'}`}>
                    {profileData.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>

              {editing && (
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleEditToggle}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Change Password</h3>
              <button
                className="modal-close"
                onClick={() => setShowPasswordModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPasswordModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePasswordChange}
                disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Database Schema Modal */}
      <DatabaseSchemaModal
        isOpen={showSchemaModal}
        onClose={() => setShowSchemaModal(false)}
      />
    </div>
  );
};

export default Profile;
