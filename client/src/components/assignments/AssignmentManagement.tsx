import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import Pagination from '../common/Pagination';
import ExportButton from '../common/ExportButton';
import './Assignments.css';

interface CreatedAssignment {
  id: string;
  name: string;
  description: string;
  pdfFileName?: string;
  pdfFileSize?: number;
  creationDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  instructorName: string;
  createdBy: string;
}

interface AssignmentDistribution {
  id: string;
  assignmentId: string;
  assignmentName: string;
  assignmentDescription: string;
  pdfFileName?: string;
  classId: string;
  className: string;
  assignmentType: 'class' | 'group' | 'individual';
  groupId?: string;
  groupName?: string;
  userId?: string;
  studentName?: string;
  scheduledDate: string;
  deadline: string;
  status: string;
  assignedAt: string;
  instructorName: string;
}

interface Class {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  classId: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
}

const AssignmentManagement: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [assignmentDistributions, setAssignmentDistributions] = useState<AssignmentDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal states
  const [showNewAssignmentModal, setShowNewAssignmentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingDistribution, setEditingDistribution] = useState<AssignmentDistribution | null>(null);
  const [viewingDistribution, setViewingDistribution] = useState<AssignmentDistribution | null>(null);
  const [deletingDistributionId, setDeletingDistributionId] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignmentDistributions();
    fetchClasses();
  }, []);

  const fetchAssignmentDistributions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/assignment-distributions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAssignmentDistributions(data.distributions || []);
      } else {
        console.error('Failed to fetch assignment distributions');
        setAssignmentDistributions([]);
      }
    } catch (error) {
      console.error('Error fetching assignment distributions:', error);
      setAssignmentDistributions([]);
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
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };
  const handleEditDistribution = (distribution: AssignmentDistribution) => {
    setEditingDistribution(distribution);
    setShowEditModal(true);
  };

  const handleViewDistribution = (distribution: AssignmentDistribution) => {
    setViewingDistribution(distribution);
    setShowViewModal(true);
  };

  const handleDownloadPDF = async (assignmentId: string, fileName: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/assignments/created/${assignmentId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        showError('Download Failed', 'Failed to download PDF file');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showError('Download Failed', 'Failed to download PDF file');
    }
  };

  const handleDeleteDistribution = (distributionId: string) => {
    setDeletingDistributionId(distributionId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteDistribution = async () => {
    if (!deletingDistributionId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/assignment-distributions/${deletingDistributionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showSuccess('Assignment Removed', 'Assignment distribution has been removed successfully');
        fetchAssignmentDistributions();
        setShowDeleteConfirm(false);
        setDeletingDistributionId(null);
      } else {
        const errorData = await response.json();
        showError('Delete Failed', errorData.error || 'Failed to remove assignment distribution');
      }
    } catch (error) {
      console.error('Error deleting assignment distribution:', error);
      showError('Delete Failed', 'Failed to remove assignment distribution. Please try again.');
    }
  };

  const cancelDeleteDistribution = () => {
    setShowDeleteConfirm(false);
    setDeletingDistributionId(null);
  };

  // Filter assignment distributions
  const filteredDistributions = assignmentDistributions.filter(distribution => {
    const matchesSearch = distribution.assignmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         distribution.assignmentDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         distribution.className.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !classFilter || distribution.classId === classFilter;
    const matchesType = !assignmentTypeFilter || distribution.assignmentType === assignmentTypeFilter;
    return matchesSearch && matchesClass && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDistributions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDistributions = filteredDistributions.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="assignments">
        <div className="loading-container">
          <div className="loading-spinner">Loading assignment management...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="assignments">
      <div className="assignments-header">
        <h1>Assignment Management</h1>
        <p>Assign created assignments to classes, groups, or individual students.</p>
      </div>

      {/* New Assignment Button */}
      {(user?.role === 'instructor' || user?.role === 'admin') && (
        <div className="create-assignment-section">
          <button
            className="btn btn-primary"
            onClick={() => setShowNewAssignmentModal(true)}
          >
            + New Assignment
          </button>
          <ExportButton
            exportType="assignments"
            filters={{
              classId: classFilter,
            }}
            size="md"
            variant="outline"
          >
            📤 Export Assignments
          </ExportButton>
        </div>
      )}

      {/* Search and Filters */}
      <div className="assignments-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="classFilter">Filter by Class:</label>
          <select
            id="classFilter"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="assignmentTypeFilter">Filter by Type:</label>
          <select
            id="assignmentTypeFilter"
            value={assignmentTypeFilter}
            onChange={(e) => setAssignmentTypeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="class">Class Assignment</option>
            <option value="group">Group Assignment</option>
            <option value="individual">Individual Assignment</option>
          </select>
        </div>
      </div>

      {/* Assignment Distributions Table */}
      <div className="assignments-table-container">
        <table className="assignments-table">
          <thead>
            <tr>
              <th>Assignment Name</th>
              <th>Class</th>
              <th>Assigned To</th>
              <th>Type</th>
              <th>Scheduled Date</th>
              <th>Deadline</th>
              <th>PDF File</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDistributions.length === 0 ? (
              <tr>
                <td colSpan={9} className="no-assignments">
                  <div className="no-data">
                    <h3>No assignment distributions found</h3>
                    <p>No assignment distributions match your current filters. Click "New Assignment" to create one.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedDistributions.map((distribution) => (
                <tr key={distribution.id} className="assignment-row">
                  <td className="assignment-title">
                    <div className="title-cell">
                      <h4>{distribution.assignmentName}</h4>
                      {distribution.assignmentDescription && (
                        <p className="assignment-description">{distribution.assignmentDescription}</p>
                      )}
                    </div>
                  </td>
                  <td>{distribution.className}</td>
                  <td>
                    {distribution.assignmentType === 'class' ? 'Entire Class' :
                     distribution.assignmentType === 'group' ? distribution.groupName :
                     distribution.studentName}
                  </td>
                  <td>
                    <span className={`type-badge ${distribution.assignmentType}`}>
                      {distribution.assignmentType.toUpperCase()}
                    </span>
                  </td>
                  <td>{formatDate(distribution.scheduledDate)}</td>
                  <td>{formatDate(distribution.deadline)}</td>
                  <td>
                    {distribution.pdfFileName ? (
                      <button
                        className="btn btn-sm btn-outline-primary download-btn"
                        onClick={() => handleDownloadPDF(distribution.assignmentId, distribution.pdfFileName!)}
                        title="Download PDF"
                      >
                        <span className="download-icon">📄</span>
                      </button>
                    ) : (
                      <span className="no-file">No file</span>
                    )}
                  </td>
                  <td>
                    <div className="badge-container">
                      <span className={`status-badge status-${distribution.status.toLowerCase()}`}>
                        {distribution.status.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="assignment-actions">
                    {(user?.role === 'instructor' || user?.role === 'admin') && (
                      <>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleViewDistribution(distribution)}
                          title="View Details"
                        >
                          👁️
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEditDistribution(distribution)}
                          title="Edit Assignment"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteDistribution(distribution.id)}
                          title="Delete Assignment"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredDistributions.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredDistributions.length}
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

      {/* New Assignment Modal */}
      {showNewAssignmentModal && (
        <NewAssignmentModal
          onClose={() => setShowNewAssignmentModal(false)}
          onSuccess={() => {
            setShowNewAssignmentModal(false);
            fetchAssignmentDistributions();
            showSuccess('Assignment Assigned', 'Assignment has been assigned successfully');
          }}
          classes={classes}
        />
      )}

      {/* Edit Assignment Modal */}
      {showEditModal && editingDistribution && (
        <EditDistributionModal
          distribution={editingDistribution}
          onClose={() => {
            setShowEditModal(false);
            setEditingDistribution(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingDistribution(null);
            fetchAssignmentDistributions();
            showSuccess('Assignment Updated', 'Assignment has been updated successfully');
          }}
          classes={classes}
        />
      )}

      {/* View Assignment Modal */}
      {showViewModal && viewingDistribution && (
        <ViewDistributionModal
          distribution={viewingDistribution}
          onClose={() => {
            setShowViewModal(false);
            setViewingDistribution(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={cancelDeleteDistribution}>
          <div className="modal delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="close-btn" onClick={cancelDeleteDistribution}>×</button>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to remove this assignment distribution?</p>
              <p><strong>This action cannot be undone.</strong></p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelDeleteDistribution}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDeleteDistribution}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// New Assignment Modal Component
interface NewAssignmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
  classes: Class[];
}

const NewAssignmentModal: React.FC<NewAssignmentModalProps> = ({
  onClose,
  onSuccess,
  classes
}) => {
  const { showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [assignmentType, setAssignmentType] = useState<'class' | 'group' | 'individual'>('class');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [deadline, setDeadline] = useState('');

  // Data states
  const [createdAssignments, setCreatedAssignments] = useState<CreatedAssignment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    fetchCreatedAssignments();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchGroups();
      fetchStudents();
    }
  }, [selectedClass]);

  // Auto-calculate deadline (1 week after scheduled date)
  useEffect(() => {
    if (scheduledDate) {
      const scheduledDateTime = new Date(scheduledDate);
      const deadlineDateTime = new Date(scheduledDateTime.getTime() + 7 * 24 * 60 * 60 * 1000); // Add 7 days
      setDeadline(deadlineDateTime.toISOString().slice(0, 16)); // Format for datetime-local input
    }
  }, [scheduledDate]);

  const fetchCreatedAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/assignments/created?status=published', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCreatedAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching created assignments:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/groups?classId=${selectedClass}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users?role=student&classId=${selectedClass}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAssignment || !selectedClass || !scheduledDate || !deadline) {
      showError('Validation Error', 'Please fill in all required fields');
      return;
    }

    if (assignmentType === 'group' && selectedGroups.length === 0) {
      showError('Validation Error', 'Please select at least one group');
      return;
    }

    if (assignmentType === 'individual' && selectedStudents.length === 0) {
      showError('Validation Error', 'Please select at least one student');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      // Create assignment distribution
      const response = await fetch('/api/assignment-distributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assignmentId: selectedAssignment,
          classId: selectedClass,
          assignmentType,
          groupIds: assignmentType === 'group' ? selectedGroups : undefined,
          userIds: assignmentType === 'individual' ? selectedStudents : undefined,
          scheduledDate,
          deadline
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign assignment');
      }

      onSuccess();
    } catch (error) {
      console.error('Error assigning assignment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign assignment. Please try again.';
      showError('Assignment Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal assign-assignment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Assignment</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-content">
          <div className="form-section">
            <h3>Select Assignment</h3>
            <div className="form-group">
              <label htmlFor="assignmentSelect">Assignment *</label>
              <select
                id="assignmentSelect"
                value={selectedAssignment}
                onChange={(e) => setSelectedAssignment(e.target.value)}
                className="form-control"
                required
              >
                <option value="">Select an assignment...</option>
                {createdAssignments.map(assignment => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.name} - {assignment.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>Select Class</h3>
            <div className="form-group">
              <label htmlFor="classSelect">Class *</label>
              <select
                id="classSelect"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="form-control"
                required
              >
                <option value="">Select a class...</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>Assignment Type</h3>
            <div className="assignment-type-selector">
              <label className="radio-option">
                <input
                  type="radio"
                  name="assignmentType"
                  value="class"
                  checked={assignmentType === 'class'}
                  onChange={(e) => setAssignmentType(e.target.value as 'class')}
                />
                <span>Entire Class</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="assignmentType"
                  value="group"
                  checked={assignmentType === 'group'}
                  onChange={(e) => setAssignmentType(e.target.value as 'group')}
                />
                <span>Specific Groups</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="assignmentType"
                  value="individual"
                  checked={assignmentType === 'individual'}
                  onChange={(e) => setAssignmentType(e.target.value as 'individual')}
                />
                <span>Individual Students</span>
              </label>
            </div>
          </div>
          {assignmentType === 'group' && selectedClass && (
            <div className="form-section">
              <h3>Select Groups</h3>
              <div className="selection-grid">
                {groups.length === 0 ? (
                  <p className="no-data-message">No groups found for this class.</p>
                ) : (
                  groups.map(group => (
                    <label key={group.id} className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroups([...selectedGroups, group.id]);
                          } else {
                            setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                          }
                        }}
                      />
                      <span>{group.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {assignmentType === 'individual' && selectedClass && (
            <div className="form-section">
              <h3>Select Students</h3>
              <div className="selection-grid">
                {students.length === 0 ? (
                  <p className="no-data-message">No students found for this class.</p>
                ) : (
                  students.map(student => (
                    <label key={student.id} className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id]);
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                          }
                        }}
                      />
                      <span>{student.firstName} {student.lastName} ({student.studentId})</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="form-section">
            <h3>Schedule Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="scheduledDate">Scheduled Date *</label>
                <input
                  type="datetime-local"
                  id="scheduledDate"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="deadline">Deadline *</label>
                <input
                  type="datetime-local"
                  id="deadline"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Distribution Modal Component
interface EditDistributionModalProps {
  distribution: AssignmentDistribution;
  onClose: () => void;
  onSuccess: () => void;
  classes: Class[];
}

const EditDistributionModal: React.FC<EditDistributionModalProps> = ({
  distribution,
  onClose,
  onSuccess,
  classes
}) => {
  const { showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(distribution.scheduledDate.slice(0, 16));
  const [deadline, setDeadline] = useState(distribution.deadline.slice(0, 16));
  const [status, setStatus] = useState(distribution.status);

  // Auto-calculate deadline (1 week after scheduled date) in edit modal
  useEffect(() => {
    if (scheduledDate) {
      const scheduledDateTime = new Date(scheduledDate);
      const deadlineDateTime = new Date(scheduledDateTime.getTime() + 7 * 24 * 60 * 60 * 1000); // Add 7 days
      setDeadline(deadlineDateTime.toISOString().slice(0, 16)); // Format for datetime-local input
    }
  }, [scheduledDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/assignment-distributions/${distribution.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          scheduledDate,
          deadline,
          status
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update assignment distribution');
      }

      onSuccess();
    } catch (error) {
      console.error('Error updating assignment distribution:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update assignment distribution. Please try again.';
      showError('Update Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal edit-assignment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Assignment Distribution</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-content">
          <div className="form-section">
            <h3>Assignment Details</h3>
            <div className="assignment-info">
              <p><strong>Assignment:</strong> {distribution.assignmentName}</p>
              <p><strong>Class:</strong> {distribution.className}</p>
              <p><strong>Assigned To:</strong> {
                distribution.assignmentType === 'class' ? 'Entire Class' :
                distribution.assignmentType === 'group' ? distribution.groupName :
                distribution.studentName
              }</p>
            </div>
          </div>

          <div className="form-section">
            <h3>Schedule Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="edit-scheduledDate">Scheduled Date</label>
                <input
                  type="datetime-local"
                  id="edit-scheduledDate"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-deadline">Deadline</label>
                <input
                  type="datetime-local"
                  id="edit-deadline"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Status</h3>
            <div className="form-group">
              <label htmlFor="edit-status">Status</label>
              <select
                id="edit-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-control"
              >
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// View Distribution Modal Component
interface ViewDistributionModalProps {
  distribution: AssignmentDistribution;
  onClose: () => void;
}

const ViewDistributionModal: React.FC<ViewDistributionModalProps> = ({
  distribution,
  onClose
}) => {
  if (!distribution) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal view-assignment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assignment Details</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="form-section">
            <h3>Assignment Information</h3>
            <div className="assignment-info">
              <p><strong>Assignment Name:</strong> {distribution.assignmentName || 'N/A'}</p>
              <p><strong>Description:</strong> {distribution.assignmentDescription || 'N/A'}</p>
              <p><strong>Class:</strong> {distribution.className || 'N/A'}</p>
              <p><strong>Assignment Type:</strong> {distribution.assignmentType?.toUpperCase() || 'N/A'}</p>
              <p><strong>Assigned To:</strong> {
                distribution.assignmentType === 'class' ? 'Entire Class' :
                distribution.assignmentType === 'group' ? (distribution.groupName || 'N/A') :
                (distribution.studentName || 'N/A')
              }</p>
            </div>
          </div>

          <div className="form-section">
            <h3>Schedule Information</h3>
            <div className="assignment-info">
              <p><strong>Scheduled Date:</strong> {formatDateTime(distribution.scheduledDate)}</p>
              <p><strong>Deadline:</strong> {formatDateTime(distribution.deadline)}</p>
              <p><strong>Status:</strong>
                <div className="badge-container" style={{display: 'inline-flex', marginLeft: '8px'}}>
                  <span className={`status-badge status-${distribution.status?.toLowerCase() || 'unknown'}`}>
                    {distribution.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
              </p>
              <p><strong>Assigned At:</strong> {formatDateTime(distribution.assignedAt)}</p>
              <p><strong>Instructor:</strong> {distribution.instructorName || 'N/A'}</p>
            </div>
          </div>

          {distribution.pdfFileName && (
            <div className="form-section">
              <h3>Assignment File</h3>
              <div className="assignment-info">
                <p><strong>PDF File:</strong> {distribution.pdfFileName}</p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignmentManagement;
