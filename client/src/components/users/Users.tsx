import React, { useState, useEffect } from 'react';
import Pagination from '../common/Pagination';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useAuth } from '../../contexts/AuthContext';
import { usersAPI, authAPI } from '../../services/api';
import './Users.css';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  studentId?: string;
  isActive: boolean;
  createdAt: string;
  classes?: Array<{
    class_id: string;
    class_name: string;
    grade: number;
    stream: string;
  }> | null;
  labs?: Array<{
    lab_id: string;
    lab_name: string;
    lab_code: string;
  }> | null;
}

interface Lab {
  id: string;
  lab_name: string;
  lab_code: string;
  total_computers: number;
  total_seats: number;
}

const Users: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const { confirm, ConfirmationComponent } = useConfirmation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'admin' | 'instructor' | 'student'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  // Lab assignment state
  const [availableLabs, setAvailableLabs] = useState<Lab[]>([]);
  const [showLabAssignModal, setShowLabAssignModal] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<User | null>(null);
  const [selectedLabId, setSelectedLabId] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getUsers();
      setUsers(response.data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (user: User) => {
    const action = user.isActive ? 'block' : 'unblock';
    const confirmed = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      message: `Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`,
      type: action === 'block' ? 'danger' : 'info'
    });

    if (!confirmed) return;

    try {
      await usersAPI.blockUser(user.id, !user.isActive);

      // Update the user in the local state
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === user.id ? { ...u, isActive: !u.isActive } : u
        )
      );

      showSuccess(
        `User ${action}ed`,
        `${user.firstName} ${user.lastName} has been ${action}ed successfully.`
      );
    } catch (error: any) {
      showError(
        `Failed to ${action} user`,
        error.response?.data?.error || `Failed to ${action} user`
      );
    }
  };

  const handleResetPassword = async (user: User) => {
    setSelectedUser(user);
    setShowPasswordResetModal(true);
  };

  const handlePasswordResetSubmit = async () => {
    if (!selectedUser || !newPassword) {
      showError('Validation Error', 'Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      showError('Invalid Password', 'Password must be at least 6 characters long');
      return;
    }

    try {
      await authAPI.adminResetPassword({
        userId: selectedUser.id,
        newPassword: newPassword
      });

      showSuccess(
        'Password Reset',
        `Password for ${selectedUser.firstName} ${selectedUser.lastName} has been reset successfully.`
      );

      setShowPasswordResetModal(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error: any) {
      showError(
        'Password Reset Failed',
        error.response?.data?.error || 'Failed to reset password'
      );
    }
  };

  const fetchAvailableLabs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/labs/available', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableLabs(data.labs || []);
      }
    } catch (error) {
      console.error('Error fetching available labs:', error);
    }
  };

  const assignLabToInstructor = async () => {
    if (!selectedInstructor || !selectedLabId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${selectedInstructor.id}/assign-lab`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ labId: selectedLabId }),
      });

      if (response.ok) {
        fetchUsers(); // Refresh the users list
        setShowLabAssignModal(false);
        setSelectedInstructor(null);
        setSelectedLabId('');
        showSuccess('Success', 'Lab assigned successfully!');
      } else {
        const error = await response.json();
        showError('Error', error.error || 'Failed to assign lab');
      }
    } catch (error) {
      console.error('Error assigning lab:', error);
      showError('Error', 'Error assigning lab');
    }
  };

  const removeLabFromInstructor = async (instructorId: string, labId: string) => {
    const confirmed = await confirm({
      title: 'Remove Lab Assignment',
      message: 'Are you sure you want to remove this lab assignment?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'warning'
    });

    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${instructorId}/assign-lab/${labId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        fetchUsers(); // Refresh the users list
        showSuccess('Success', 'Lab assignment removed successfully!');
      } else {
        const error = await response.json();
        showError('Error', error.error || 'Failed to remove lab assignment');
      }
    } catch (error) {
      console.error('Error removing lab assignment:', error);
      showError('Error', 'Error removing lab assignment');
    }
  };

  const openLabAssignModal = (instructor: User) => {
    setSelectedInstructor(instructor);
    setShowLabAssignModal(true);
    fetchAvailableLabs();
  };

  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === 'all' || user.role === filter;
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.studentId && user.studentId.includes(searchTerm));

    return matchesFilter && matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'role-admin';
      case 'instructor': return 'role-instructor';
      case 'student': return 'role-student';
      default: return 'role-default';
    }
  };

  if (loading) {
    return (
      <div className="users">
        <div className="users-loading">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="users">
        <div className="error-message">
          <h3>Error Loading Users</h3>
          <p>{error}</p>
          <button onClick={fetchUsers} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="users">
      <div className="users-header">
        <h1>User Management</h1>
        <p>Manage system users and their roles</p>
      </div>

      <div className="users-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search users by name, email, or student ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({users.length})
          </button>
          <button
            className={`filter-tab ${filter === 'admin' ? 'active' : ''}`}
            onClick={() => setFilter('admin')}
          >
            Admins ({users.filter(u => u.role === 'admin').length})
          </button>
          <button
            className={`filter-tab ${filter === 'instructor' ? 'active' : ''}`}
            onClick={() => setFilter('instructor')}
          >
            Instructors ({users.filter(u => u.role === 'instructor').length})
          </button>
          <button
            className={`filter-tab ${filter === 'student' ? 'active' : ''}`}
            onClick={() => setFilter('student')}
          >
            Students ({users.filter(u => u.role === 'student').length})
          </button>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Student ID</th>
              <th>Class/Labs</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((user) => (
              <tr key={user.id}>
                <td className="user-name">
                  <div className="name-cell">
                    <span className="full-name">
                      {user.firstName} {user.lastName}
                    </span>
                  </div>
                </td>
                <td className="user-email">{user.email}</td>
                <td>
                  <div className="badge-container">
                    <span className={`role-badge ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                </td>
                <td className="student-id">
                  {user.studentId || '-'}
                </td>
                <td className="class-labs-info">
                  {user.role === 'student' && user.classes ? (
                    <div className="classes-list">
                      {user.classes.map((cls, index) => (
                        <span key={`${user.id}-class-${cls.class_id}-${index}`} className="class-badge">
                          {cls.class_name}
                          {index < user.classes!.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  ) : user.role === 'instructor' && user.labs ? (
                    <div className="labs-list">
                      {user.labs.map((lab, index) => (
                        <span key={`${user.id}-lab-${lab.lab_id}-${index}`} className="lab-badge">
                          {lab.lab_code}
                          <button
                            className="remove-lab-btn"
                            onClick={() => removeLabFromInstructor(user.id, lab.lab_id)}
                            title="Remove lab assignment"
                          >
                            ×
                          </button>
                          {index < user.labs!.length - 1 && ', '}
                        </span>
                      ))}
                      <button
                        className="add-lab-btn"
                        onClick={() => openLabAssignModal(user)}
                        title="Assign lab"
                      >
                        + Assign Lab
                      </button>
                    </div>
                  ) : (
                    <span className="no-assignment">
                      {user.role === 'student' ? 'No classes' : 
                       user.role === 'instructor' ? (
                         <button
                           className="add-lab-btn"
                           onClick={() => openLabAssignModal(user)}
                         >
                           Assign Lab
                         </button>
                       ) : '-'}
                    </span>
                  )}
                </td>
                <td>
                  <div className="badge-container">
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </td>
                <td className="created-date">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="user-actions">
                  {currentUser?.role === 'admin' && (
                    <>
                      <button
                        className={`btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => handleBlockUser(user)}
                        title={user.isActive ? 'Block User' : 'Unblock User'}
                      >
                        {user.isActive ? '🚫 Block' : '✅ Unblock'}
                      </button>
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => handleResetPassword(user)}
                        title="Reset Password"
                      >
                        🔑 Reset Password
                      </button>
                    </>
                  )}
                  <button className="btn btn-sm btn-outline">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="no-users">
            <h3>No users found</h3>
            <p>No users match your current search and filter criteria.</p>
          </div>
        )}
      </div>

      {filteredUsers.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredUsers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(newItemsPerPage) => {
            setItemsPerPage(newItemsPerPage);
            setCurrentPage(1);
          }}
          showItemsPerPage={true}
          showJumpToPage={true}
          itemsPerPageOptions={[5, 10, 20, 50]}
        />
      )}

      {/* Lab Assignment Modal */}
      {showLabAssignModal && selectedInstructor && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Assign Lab to {selectedInstructor.firstName} {selectedInstructor.lastName}</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowLabAssignModal(false);
                  setSelectedInstructor(null);
                  setSelectedLabId('');
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="lab-select">Select Lab:</label>
                <select
                  id="lab-select"
                  value={selectedLabId}
                  onChange={(e) => setSelectedLabId(e.target.value)}
                  className="form-control"
                >
                  <option value="">Choose a lab...</option>
                  {availableLabs
                    .filter(lab => 
                      !selectedInstructor.labs?.some(assignedLab => assignedLab.lab_id === lab.id)
                    )
                    .map(lab => (
                      <option key={lab.id} value={lab.id}>
                        {lab.lab_name} ({lab.lab_code}) - {lab.total_computers} computers
                      </option>
                    ))
                  }
                </select>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowLabAssignModal(false);
                    setSelectedInstructor(null);
                    setSelectedLabId('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={assignLabToInstructor}
                  disabled={!selectedLabId}
                >
                  Assign Lab
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordResetModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reset Password</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowPasswordResetModal(false);
                  setSelectedUser(null);
                  setNewPassword('');
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p>
                Reset password for <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>
              </p>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength={6}
                  required
                />
                <small className="form-help">Password must be at least 6 characters long</small>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowPasswordResetModal(false);
                  setSelectedUser(null);
                  setNewPassword('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePasswordResetSubmit}
                disabled={!newPassword || newPassword.length < 6}
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationComponent />
    </div>
  );
};

export default Users;
