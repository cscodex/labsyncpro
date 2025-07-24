import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../hooks/useConfirmation';
import './Groups.css';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
}

interface Class {
  id: string;
  name: string;
  className?: string;
  subject: string;
  instructor: string;
}

interface GroupMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  role: string;
}

interface Group {
  id: string;
  name: string;
  className: string;
  classId: string;
  memberCount: number;
  maxMembers: number;
  leaderId: string;
  leaderName: string;
  members: GroupMember[];
  description?: string;
}

const Groups: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const { confirm, ConfirmationComponent } = useConfirmation();
  
  // State variables
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [viewingGroup, setViewingGroup] = useState<Group | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [jumpToPage, setJumpToPage] = useState('');

  // Form data states
  const [classes, setClasses] = useState<Class[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedLeader, setSelectedLeader] = useState<string>('');
  const [groupName, setGroupName] = useState('');
  const [maxMembers, setMaxMembers] = useState(4);
  const [groupDescription, setGroupDescription] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [groupNameError, setGroupNameError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchGroups();
    fetchClasses();
  }, []);

  const fetchGroups = async (filterClassId?: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      let url = '/api/groups';
      if (filterClassId) {
        url += `?classId=${filterClassId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }

      const data = await response.json();
      setGroups(data.groups || []);
      setTotalPages(Math.ceil((data.groups || []).length / itemsPerPage));
    } catch (err) {
      console.error('Error fetching groups:', err);
      showNotification('Failed to fetch groups', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }

      const data = await response.json();
      setClasses(data.classes || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchAvailableStudents = async (classId: string) => {
    if (!classId) {
      setAvailableStudents([]);
      return;
    }

    setLoadingStudents(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/groups/available-students/${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Remove duplicates based on student ID
        const uniqueStudents = data.filter((student: any, index: number, self: any[]) =>
          index === self.findIndex(s => s.id === student.id)
        );
        setAvailableStudents(uniqueStudents);
      } else {
        setAvailableStudents([]);
      }
    } catch (err) {
      console.error('Error fetching available students:', err);
      setAvailableStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Group Management Functions
  const handleCreateGroup = async () => {
    // Validation
    if (!selectedClass) {
      setGroupNameError('Please select a class');
      return;
    }

    if (!groupName.trim()) {
      setGroupNameError('Group name is required');
      return;
    }

    if (selectedStudents.length < 2) {
      setGroupNameError('Please select at least 2 students');
      return;
    }

    if (maxMembers < 3) {
      setGroupNameError('Maximum members must be at least 3');
      return;
    }

    if (!selectedLeader) {
      setGroupNameError('Please select a group leader');
      return;
    }

    setIsCreating(true);
    setGroupNameError('');

    try {
      const token = localStorage.getItem('token');

      // Remove duplicates and ensure valid data
      const uniqueStudentIds = [...new Set(selectedStudents)].filter(id => id && id.trim());

      const requestData = {
        groupName: groupName.trim(),
        classId: selectedClass,
        maxMembers,
        description: groupDescription.trim(),
        studentIds: uniqueStudentIds,
        leaderId: selectedLeader
      };

      console.log('Creating group with data:', requestData);

      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create group');
      }

      // Reset form and close modal
      resetCreateForm();
      setShowCreateModal(false);
      fetchGroups();
      
      // Show success notification
      showNotification('Group created successfully!', 'success');
    } catch (error) {
      console.error('Error creating group:', error);
      setGroupNameError(error instanceof Error ? error.message : 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditGroup = async () => {
    if (!editingGroup) return;

    // Validation
    if (!groupName.trim()) {
      setGroupNameError('Group name is required');
      return;
    }

    if (maxMembers < 3) {
      setGroupNameError('Maximum members must be at least 3');
      return;
    }

    setIsCreating(true);
    setGroupNameError('');

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/groups/${editingGroup.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupName: groupName.trim(),
          maxMembers,
          description: groupDescription.trim(),
          leaderId: selectedLeader
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update group');
      }

      setShowEditModal(false);
      setEditingGroup(null);
      resetCreateForm();
      fetchGroups();

      // Show success notification
      showSuccess('Success', 'Group updated successfully!');
    } catch (error) {
      console.error('Error updating group:', error);
      setGroupNameError(error instanceof Error ? error.message : 'Failed to update group');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddMemberToGroup = async (studentId: string) => {
    if (!editingGroup) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/groups/${editingGroup.id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: studentId,
          role: 'member'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add member');
      }

      // Update local state
      setSelectedStudents(prev => [...prev, studentId]);

      // Refresh available students
      fetchAvailableStudents(editingGroup.classId);
      fetchGroups();

      // Show success notification
      showSuccess('Success', 'Member added successfully!');
    } catch (error) {
      console.error('Error adding member:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to add member');
    }
  };

  const handleRemoveMemberFromGroup = async (studentId: string) => {
    if (!editingGroup) return;

    // Find the student name for confirmation
    const student = editingGroup.members.find(m => m.id === studentId);
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'this student';

    const confirmed = await confirm({
      title: 'Remove Member',
      message: `Are you sure you want to remove ${studentName} from this group? They will be moved back to the default group.`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'warning'
    });

    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/groups/${editingGroup.id}/members/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove member');
      }

      // Update local state
      setSelectedStudents(prev => prev.filter(id => id !== studentId));

      // If removed student was leader, clear leader selection
      if (selectedLeader === studentId) {
        setSelectedLeader('');
      }

      // Refresh available students
      fetchAvailableStudents(editingGroup.classId);
      fetchGroups();

      // Show success notification
      showSuccess('Success', `${studentName} removed from group successfully!`);
    } catch (error) {
      console.error('Error removing member:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to remove member');
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/groups/${deletingGroup.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete group');
      }

      setShowDeleteModal(false);
      setDeletingGroup(null);
      fetchGroups();
      showNotification('Group deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting group:', error);
      showNotification('Failed to delete group', 'error');
    }
  };

  const openDeleteModal = (group: Group) => {
    setDeletingGroup(group);
    setShowDeleteModal(true);
  };

  const openViewModal = (group: Group) => {
    setViewingGroup(group);
    setShowViewModal(true);
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setMaxMembers(group.maxMembers || 4);
    setGroupDescription(group.description || '');
    setSelectedStudents(group.members.map(m => m.id));
    setSelectedLeader(group.leaderId || '');
    setShowEditModal(true);
    // Fetch available students for this class
    fetchAvailableStudents(group.classId);
  };

  // Utility Functions
  const resetCreateForm = () => {
    setSelectedClass('');
    setSelectedStudents([]);
    setSelectedLeader('');
    setGroupName('');
    setMaxMembers(4);
    setGroupDescription('');
    setAvailableStudents([]);
    setStudentSearchTerm('');
    setGroupNameError('');
  };

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    setSelectedStudents([]);
    setSelectedLeader('');
    setStudentSearchTerm('');
    fetchAvailableStudents(classId);
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => {
      const isCurrentlySelected = prev.includes(studentId);

      // If trying to add a student but group is full, don't allow it
      if (!isCurrentlySelected && prev.length >= maxMembers) {
        return prev;
      }

      const newSelection = isCurrentlySelected
        ? prev.filter(id => id !== studentId)
        : [...new Set([...prev, studentId])];

      // Reset leader if they're no longer selected
      if (!newSelection.includes(selectedLeader)) {
        setSelectedLeader('');
      }

      return newSelection;
    });
  };

  const handleSelectAllStudents = () => {
    const filteredStudents = getFilteredStudents();
    const allIds = filteredStudents.map(s => s.id).slice(0, maxMembers);
    setSelectedStudents(allIds);
    setSelectedLeader(''); // Reset leader selection
  };

  const handleDeselectAllStudents = () => {
    setSelectedStudents([]);
    setSelectedLeader('');
  };

  const getFilteredStudents = () => {
    return availableStudents.filter(student => {
      const searchLower = studentSearchTerm.toLowerCase();
      return (
        student.firstName.toLowerCase().includes(searchLower) ||
        student.lastName.toLowerCase().includes(searchLower) ||
        student.studentId.toLowerCase().includes(searchLower)
      );
    });
  };

  const getSelectedStudentOptions = () => {
    return availableStudents.filter(student => selectedStudents.includes(student.id));
  };

  const getRemainingSlots = () => {
    return Math.max(0, maxMembers - selectedStudents.length);
  };

  const getStudentCountDisplay = () => {
    const selectedCount = selectedStudents.length;
    const remaining = getRemainingSlots();

    if (selectedCount === 0) {
      return `No students selected (${maxMembers} slots available)`;
    } else if (remaining === 0) {
      return `${selectedCount} students selected (group full)`;
    } else {
      return `${selectedCount} student${selectedCount !== 1 ? 's' : ''} selected, ${remaining} slot${remaining !== 1 ? 's' : ''} remaining`;
    }
  };

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.leaderName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = !classFilter || group.classId === classFilter;

    return matchesSearch && matchesClass;
  });

  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentGroups = filteredGroups.slice(startIndex, endIndex);

  // Update total pages when filtered groups or items per page changes
  React.useEffect(() => {
    const newTotalPages = Math.ceil(filteredGroups.length / itemsPerPage);
    setTotalPages(newTotalPages);

    // Reset to page 1 if current page is beyond new total pages
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredGroups.length, itemsPerPage, currentPage]);

  // Pagination handlers
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setJumpToPage('');
    }
  };

  const handlePageJumpKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  };

  if (loading) {
    return <div className="loading">Loading groups...</div>;
  }

  return (
    <div className="groups-container">
      <div className="groups-header">
        <h1>Groups Management</h1>
        <button
          className="create-group-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <span>➕</span> Create Group
        </button>
      </div>

      <div className="groups-controls">
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name || cls.className}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {currentGroups.length === 0 ? (
        <div className="no-groups">
          <p>No groups found.</p>
        </div>
      ) : (
        <div className="groups-table-container">
          <table className="groups-table">
            <thead>
              <tr>
                <th>Group Name</th>
                <th>Class</th>
                <th>Leader</th>
                <th>Members</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentGroups.map((group) => (
                <tr key={group.id}>
                  <td>{group.name}</td>
                  <td>{group.className}</td>
                  <td>{group.leaderName}</td>
                  <td>
                    <span className={`member-count ${group.memberCount >= group.maxMembers ? 'full' : ''}`}>
                      {group.memberCount}/{group.maxMembers}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-info btn-sm"
                        onClick={() => openViewModal(group)}
                        title="View Details"
                      >
                        👁️
                      </button>
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => openEditModal(group)}
                        title="Edit Group"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => openDeleteModal(group)}
                        title="Delete Group"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Enhanced Pagination Controls */}
      <div className="pagination-container">
        <div className="pagination-info-section">
          <span className="results-info">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredGroups.length)} of {filteredGroups.length} groups
          </span>
        </div>

        <div className="pagination-controls">
          {/* Records per page */}
          <div className="records-per-page">
            <label>Show:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
              className="records-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>per page</span>
          </div>

          {/* Page navigation */}
          {totalPages > 1 && (
            <div className="page-navigation">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="pagination-btn"
                title="First page"
              >
                ⟪
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
                title="Previous page"
              >
                ⟨
              </button>

              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
                title="Next page"
              >
                ⟩
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
                title="Last page"
              >
                ⟫
              </button>
            </div>
          )}

          {/* Jump to page */}
          {totalPages > 1 && (
            <div className="jump-to-page">
              <label>Go to:</label>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={jumpToPage}
                onChange={(e) => setJumpToPage(e.target.value)}
                onKeyPress={handlePageJumpKeyPress}
                className="page-input"
                placeholder="Page"
              />
              <button
                onClick={handleJumpToPage}
                disabled={!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > totalPages}
                className="pagination-btn"
              >
                Go
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Group</h3>
              <button
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {/* Class Selection */}
              <div className="form-group">
                <label>Select Class *</label>
                <select
                  value={selectedClass}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="form-control"
                >
                  <option value="">Choose a class...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name || cls.className}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClass && (
                <>
                  {/* Group Name */}
                  <div className="form-group">
                    <label>Group Name *</label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => {
                        setGroupName(e.target.value);
                        setGroupNameError('');
                      }}
                      className={`form-control ${groupNameError ? 'error' : ''}`}
                      placeholder="Enter group name"
                    />
                    {groupNameError && (
                      <div className="error-message">{groupNameError}</div>
                    )}
                  </div>

                  {/* Maximum Members */}
                  <div className="form-group max-members-highlight">
                    <label>Maximum Members (Default: 4)</label>
                    <input
                      type="number"
                      value={maxMembers}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 4;
                        setMaxMembers(Math.max(3, Math.min(10, value)));
                      }}
                      className="form-control"
                      min="3"
                      max="10"
                      placeholder="4"
                    />
                    <div className="form-text">
                      Set the maximum number of students allowed in this group (3-10 members)
                    </div>
                  </div>

                  {/* Description */}
                  <div className="form-group">
                    <label>Description (Optional)</label>
                    <textarea
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                      className="form-control"
                      placeholder="Enter group description"
                      rows={3}
                    />
                  </div>

                  {/* Student Selection */}
                  <div className="form-group">
                    <label>Select Students *</label>

                    {/* Student Count Display */}
                    <div className="student-count-display">
                      <div className="count-info">
                        <span className="selected-count">
                          {selectedStudents.length} selected
                        </span>
                        <span className="remaining-slots">
                          {getStudentCountDisplay()}
                        </span>
                      </div>
                      {selectedStudents.length >= maxMembers && (
                        <span style={{ color: '#e74c3c', fontWeight: 600 }}>
                          Group Full
                        </span>
                      )}
                    </div>

                    {loadingStudents ? (
                      <div className="loading-students">Loading students...</div>
                    ) : availableStudents.length === 0 ? (
                      <div className="no-students">
                        No available students in this class
                      </div>
                    ) : (
                      <>
                        {/* Search and Controls */}
                        <div className="student-controls">
                          <input
                            type="text"
                            value={studentSearchTerm}
                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                            className="form-control search-input"
                            placeholder="Search students by name or ID..."
                          />
                          <div className="selection-controls">
                            <button
                              type="button"
                              onClick={handleSelectAllStudents}
                              className="btn btn-sm btn-outline"
                              disabled={getFilteredStudents().length === 0 || selectedStudents.length >= maxMembers}
                              title={selectedStudents.length >= maxMembers ? 'Group is full' : `Select up to ${maxMembers} students`}
                            >
                              Select All ({Math.min(getFilteredStudents().length, maxMembers)})
                            </button>
                            <button
                              type="button"
                              onClick={handleDeselectAllStudents}
                              className="btn btn-sm btn-outline"
                              disabled={selectedStudents.length === 0}
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>

                        {/* Students List */}
                        <div className="students-list">
                          {getFilteredStudents().map((student) => {
                            const isSelected = selectedStudents.includes(student.id);
                            const isGroupFull = selectedStudents.length >= maxMembers;
                            const canSelect = isSelected || !isGroupFull;

                            return (
                              <div key={student.id} className="student-item">
                                <label className={`checkbox-label ${!canSelect ? 'disabled' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleStudentToggle(student.id)}
                                    disabled={!canSelect}
                                  />
                                  <span className="student-info">
                                    <span className="student-name">
                                      {student.firstName} {student.lastName} ({student.studentId})
                                    </span>
                                    {!canSelect && (
                                      <span style={{ color: '#e74c3c', fontSize: '0.8rem' }}>
                                        Group full
                                      </span>
                                    )}
                                  </span>
                                </label>
                              </div>
                            );
                          })}
                          {getFilteredStudents().length === 0 && studentSearchTerm && (
                            <div className="no-results">
                              No students found matching "{studentSearchTerm}"
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Leader Selection */}
                  {selectedStudents.length > 0 && (
                    <div className="form-group">
                      <label>Select Group Leader *</label>
                      <select
                        value={selectedLeader}
                        onChange={(e) => setSelectedLeader(e.target.value)}
                        className="form-control"
                      >
                        <option value="">Choose a leader...</option>
                        {getSelectedStudentOptions().map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.firstName} {student.lastName} ({student.studentId})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  className="btn btn-primary"
                  disabled={
                    isCreating ||
                    !selectedClass ||
                    !groupName.trim() ||
                    selectedStudents.length < 2 ||
                    !selectedLeader
                  }
                >
                  {isCreating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingGroup && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Delete Group</h3>
              <button
                className="close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete the group "{deletingGroup.name}"?</p>
              <p className="warning-text">This action cannot be undone.</p>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteGroup}
                  className="btn btn-danger"
                >
                  Delete Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Group Modal */}
      {showViewModal && viewingGroup && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>👥 Group Details: {viewingGroup.name}</h3>
              <button
                className="close-btn"
                onClick={() => setShowViewModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="group-details">
                <div className="detail-row">
                  <strong>Group Name:</strong>
                  <span>{viewingGroup.name}</span>
                </div>
                <div className="detail-row">
                  <strong>Class:</strong>
                  <span>{viewingGroup.className}</span>
                </div>
                <div className="detail-row">
                  <strong>Leader:</strong>
                  <span>👑 {viewingGroup.leaderName}</span>
                </div>
                <div className="detail-row">
                  <strong>Members:</strong>
                  <span className={`member-count ${viewingGroup.memberCount >= viewingGroup.maxMembers ? 'full' : ''}`}>
                    {viewingGroup.memberCount}/{viewingGroup.maxMembers}
                    {viewingGroup.memberCount >= viewingGroup.maxMembers && ' (Full)'}
                  </span>
                </div>
                {viewingGroup.description && (
                  <div className="detail-row">
                    <strong>Description:</strong>
                    <span>{viewingGroup.description}</span>
                  </div>
                )}

                {/* Group Members List */}
                <div className="members-section">
                  <h4>👥 Group Members</h4>
                  <div className="members-list">
                    {viewingGroup.members && viewingGroup.members.length > 0 ? (
                      viewingGroup.members.map((member) => (
                        <div key={member.id} className="member-item">
                          <span className="member-info">
                            {member.role === 'leader' ? '👑' : '👤'}
                            {member.firstName} {member.lastName} ({member.studentId})
                            {member.role === 'leader' && <span className="leader-badge">Leader</span>}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="no-members">No members found</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditModal && editingGroup && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Group</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingGroup(null);
                  resetCreateForm();
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Class</label>
                <input
                  type="text"
                  value={editingGroup.className}
                  className="form-control"
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Group Name *</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="form-control"
                  placeholder="Enter group name"
                />
              </div>

              <div className="form-group">
                <label>Max Members</label>
                <input
                  type="number"
                  value={maxMembers}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 4;
                    setMaxMembers(Math.max(3, Math.min(10, value)));
                  }}
                  className="form-control"
                  min="3"
                  max="10"
                />
                <small className="form-text text-muted">
                  Groups must have between 3 and 10 members
                </small>
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="form-control"
                  placeholder="Enter group description"
                  rows={3}
                />
              </div>

              {/* Current Group Members */}
              <div className="form-group">
                <label>Current Group Members ({selectedStudents.length}/{maxMembers})</label>
                <div className="current-members">
                  {editingGroup.members.filter(member => selectedStudents.includes(member.id)).map((member) => (
                    <div key={member.id} className="member-item">
                      <span className="member-info">
                        {member.firstName} {member.lastName} ({member.studentId})
                        {member.id === selectedLeader && <span className="leader-badge"> - Leader</span>}
                      </span>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveMemberFromGroup(member.id)}
                        title="Remove from group"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {selectedStudents.length === 0 && (
                    <p className="no-members">No members in this group</p>
                  )}
                </div>
              </div>

              {/* Available Students to Add */}
              {availableStudents.length > 0 && selectedStudents.length < maxMembers && (
                <div className="form-group">
                  <label>Add Students to Group</label>
                  <div className="available-students">
                    {availableStudents.map((student) => (
                      <div key={student.id} className="student-item">
                        <span className="student-info">
                          {student.firstName} {student.lastName} ({student.studentId})
                        </span>
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => handleAddMemberToGroup(student.id)}
                          title="Add to group"
                        >
                          ➕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leader Selection */}
              {selectedStudents.length > 0 && (
                <div className="form-group">
                  <label>Group Leader *</label>
                  <select
                    value={selectedLeader}
                    onChange={(e) => setSelectedLeader(e.target.value)}
                    className="form-control"
                  >
                    <option value="">Select a leader...</option>
                    {editingGroup.members.filter(member => selectedStudents.includes(member.id)).map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.firstName} {member.lastName} ({member.studentId})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {groupNameError && (
                <div className="error-message">{groupNameError}</div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingGroup(null);
                  resetCreateForm();
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditGroup}
                disabled={isCreating}
                className="btn btn-primary"
              >
                {isCreating ? 'Updating...' : 'Update Group'}
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

export default Groups;
