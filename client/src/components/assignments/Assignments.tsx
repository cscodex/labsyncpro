import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import LabSyncProLogo from '../common/LabSyncProLogo';
import './Assignments.css';

interface AssignmentStats {
  totalSchedules: number;
  totalAssignments: number;
  pendingAssignments: number;
  completedAssignments: number;
  upcomingDeadlines: number;
}



const Assignments: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'group' | 'individual'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal states
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState<string>('');
  const [consolidatedView, setConsolidatedView] = useState(true);



  useEffect(() => {
    fetchAssignments();
    fetchClasses();
  }, [consolidatedView]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const endpoint = consolidatedView ? '/api/assignments/consolidated' : '/api/assignments';
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      } else {
        console.error('Failed to fetch assignments');
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setAssignments([]);
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



  const filteredAssignments = assignments.filter(assignment => {
    const matchesFilter = filter === 'all' || assignment.assignmentType === filter;
    const matchesSearch = assignment.scheduleTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.labName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === '' || assignment.classId === classFilter;
    const matchesAssignmentType = assignmentTypeFilter === '' || assignment.assignmentType === assignmentTypeFilter;

    return matchesFilter && matchesSearch && matchesClass && matchesAssignmentType;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssignments = filteredAssignments.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm, classFilter, assignmentTypeFilter]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return '#3498db';
      case 'in_progress': return '#f39c12';
      case 'completed': return '#27ae60';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDetails = async (assignmentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedAssignment(data.assignment);
      } else {
        showError('Error', 'Failed to fetch assignment details');
      }
    } catch (error) {
      console.error('Error fetching assignment details:', error);
      showError('Network Error', 'Unable to connect to the server');
    }
  };

  const handleEditAssignment = async (assignment: Assignment) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/assignments/${assignment.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEditingAssignment(data.assignment);
        setShowEditModal(true);
      } else {
        showError('Error', 'Failed to fetch assignment details for editing');
      }
    } catch (error) {
      console.error('Error fetching assignment for editing:', error);
      showError('Error', 'Failed to fetch assignment details for editing');
    }
  };



  const handleDownloadFile = async (scheduleId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/schedules/${scheduleId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download file');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'assignment.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess('Download Started', 'Assignment file download has started');
    } catch (error) {
      console.error('Download error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to download file';
      showError('Download Failed', errorMessage);
    }
  };

  if (loading) {
    return (
      <LoadingSpinner
        size="large"
        message="Loading assignments..."
      />
    );
  }

  return (
    <div className="assignments">
      <div className="assignments-header">
        <h1>Practical Assignments</h1>
        <p>
          {user?.role === 'instructor' || user?.role === 'admin'
            ? 'Create and manage practical assignments for students and groups'
            : 'View your assigned practicals and lab sessions'
          }
        </p>
      </div>

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

        <div className="filter-section">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>

          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Types
            </button>
            <button
              className={`filter-tab ${filter === 'group' ? 'active' : ''}`}
              onClick={() => setFilter('group')}
            >
              Group Assignments
            </button>
            <button
              className={`filter-tab ${filter === 'individual' ? 'active' : ''}`}
              onClick={() => setFilter('individual')}
            >
              Individual Assignments
            </button>
          </div>

          <div className="view-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={consolidatedView}
                onChange={(e) => setConsolidatedView(e.target.checked)}
              />
              <span className="toggle-text">Consolidated View</span>
            </label>
          </div>
        </div>
      </div>

      {/* Create New Practical Assignment */}
      {(user?.role === 'instructor' || user?.role === 'admin') && (
        <div className="create-assignment-section">
          <div className="create-assignment-header">
            <h3>Create New Practical Assignment</h3>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              + New Practical Assignment
            </button>
          </div>
          <p className="create-assignment-note">
            Create practical assignments for classes, groups, or individual students.
            Use <strong>Capacity Planning</strong> to manage seat and computer assignments.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="assignments-filters">
        <div className="filter-group">
          <label htmlFor="classFilter">Filter by Class:</label>
          <select
            id="classFilter"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Classes</option>
            {classes.map((cls: any) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
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

      <div className="assignments-table-container">
        <table className="assignments-table">
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Lab</th>
              <th>Class</th>
              <th>Type</th>
              <th>Assigned To</th>
              {!consolidatedView && <th>Computer</th>}
              <th>Scheduled Date</th>
              {consolidatedView && <th>Deadline</th>}
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAssignments.length === 0 ? (
              <tr>
                <td colSpan={consolidatedView ? 9 : 10} className="no-assignments">
                  <div className="no-data">
                    <h3>No assignments found</h3>
                    <p>No assignments match your current filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedAssignments.map((assignment) => (
                <tr key={assignment.id} className="assignment-row">
                  <td className="assignment-title">
                    <div className="title-cell">
                      <span className="title">{assignment.scheduleTitle}</span>
                      <span className="description">{assignment.description}</span>
                    </div>
                  </td>
                  <td className="lab-name">{assignment.labName}</td>
                  <td className="class-name">{assignment.className}</td>
                  <td>
                    <span className={`type-badge ${assignment.assignmentType}`}>
                      {assignment.assignmentType}
                    </span>
                  </td>
                  <td className="assigned-to">
                    {consolidatedView ? (
                      <span className="consolidated-assignment">
                        {assignment.assigned_to || 'No assignments'}
                      </span>
                    ) : (
                      assignment.assignmentType === 'group' ? (
                        <span className="group-assignment">
                          👥 {assignment.groupName}
                        </span>
                      ) : assignment.assignmentType === 'class' ? (
                        <span className="class-assignment">
                          🏫 Entire Class
                        </span>
                      ) : (
                        <span className="individual-assignment">
                          👤 {assignment.studentName}
                        </span>
                      )
                    )}
                  </td>
                  {!consolidatedView && (
                    <td className="computer-info">
                      {assignment.computerName || 'Not assigned'}
                    </td>
                  )}
                  <td className="scheduled-date">
                    {formatDate(assignment.scheduledDate)}
                  </td>
                  {consolidatedView && (
                    <td className="deadline-date">
                      {assignment.deadline ? formatDate(assignment.deadline) : 'No deadline'}
                    </td>
                  )}
                  <td>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(assignment.status) }}
                    >
                      {assignment.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="assignment-actions">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleViewDetails(assignment.id)}
                    >
                      View Details
                    </button>
                    {assignment.originalFilename && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleDownloadFile(assignment.scheduleId)}
                        title="Download Assignment PDF"
                      >
                        📄 Download
                      </button>
                    )}
                    {user?.role === 'instructor' && (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleEditAssignment(assignment)}
                          title="Edit Assignment"
                        >
                          ✏️ Edit
                        </button>
                        <button className="btn btn-sm btn-secondary">
                          Manage
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

      {filteredAssignments.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAssignments.length}
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

      {/* Assignment Detail Modal */}
      {selectedAssignment && (
        <AssignmentDetailModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <CreateAssignmentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchAssignments();
            showSuccess('Assignment Created', 'Assignment has been created successfully');
          }}
        />
      )}

      {/* Edit Assignment Modal */}
      {showEditModal && editingAssignment && (
        <EditAssignmentModal
          assignment={editingAssignment}
          onClose={() => {
            setShowEditModal(false);
            setEditingAssignment(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingAssignment(null);
            fetchAssignments();
            showSuccess('Assignment Updated', 'Assignment has been updated successfully');
          }}
        />
      )}
    </div>
  );
};

// Assignment Detail Modal Component
interface AssignmentDetailModalProps {
  assignment: any;
  onClose: () => void;
}

const AssignmentDetailModal: React.FC<AssignmentDetailModalProps> = ({ assignment, onClose }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownloadPDF = async (fileId: string, filename: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/schedules/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal assignment-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assignment Details</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="assignment-detail-info">
            <div className="info-section">
              <h3>Assignment Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Title:</label>
                  <span>{assignment.schedule_title}</span>
                </div>
                <div className="info-item">
                  <label>Description:</label>
                  <span>{assignment.description || 'No description provided'}</span>
                </div>
                <div className="info-item">
                  <label>Lab:</label>
                  <span>{assignment.lab_name}</span>
                </div>
                <div className="info-item">
                  <label>Class:</label>
                  <span>{assignment.class_name || 'No class assigned'}</span>
                </div>
                <div className="info-item">
                  <label>Instructor:</label>
                  <span>{assignment.instructor_name}</span>
                </div>
                <div className="info-item">
                  <label>Scheduled Date:</label>
                  <span>{formatDate(assignment.scheduled_date)}</span>
                </div>
                <div className="info-item">
                  <label>Duration:</label>
                  <span>{assignment.duration_minutes} minutes</span>
                </div>
                <div className="info-item">
                  <label>Status:</label>
                  <span className="status-badge">{assignment.status?.replace('_', ' ').toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="info-section">
              <h3>Assignment Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Assignment Type:</label>
                  <span>{assignment.assignment_type}</span>
                </div>
                {assignment.group_name && (
                  <div className="info-item">
                    <label>Assigned Group:</label>
                    <span>{assignment.group_name}</span>
                  </div>
                )}
                {assignment.student_name && (
                  <div className="info-item">
                    <label>Assigned Student:</label>
                    <span>{assignment.student_name}</span>
                  </div>
                )}
                {assignment.computer_name && (
                  <div className="info-item">
                    <label>Assigned Computer:</label>
                    <span>{assignment.computer_name} (#{assignment.computer_number})</span>
                  </div>
                )}
                <div className="info-item">
                  <label>Lab Location:</label>
                  <span>{assignment.lab_location || 'Not specified'}</span>
                </div>
              </div>
            </div>

            {/* Assignment Files Section */}
            {assignment.original_filename && (
              <div className="info-section">
                <h3>Assignment Files</h3>
                <div className="file-info">
                  <div className="file-item">
                    <div className="file-details">
                      <span className="file-name">📄 {assignment.original_filename}</span>
                      <span className="file-size">
                        {assignment.file_size ? `(${(assignment.file_size / 1024).toFixed(1)} KB)` : ''}
                      </span>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleDownloadPDF(assignment.file_id, assignment.original_filename)}
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Create Assignment Modal Component
interface CreateAssignmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({ onClose, onSuccess }) => {
  const { showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [labs, setLabs] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Helper function to generate default date/time values
  const getDefaultValues = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const scheduledDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Calculate end time (start time + 30 minutes)
    const startTimeDate = new Date(`2000-01-01T${currentTime}`);
    startTimeDate.setMinutes(startTimeDate.getMinutes() + 30);
    const endTime = startTimeDate.toTimeString().slice(0, 5);

    // Deadline: 7 days after scheduled date
    const deadlineDate = new Date(tomorrow);
    deadlineDate.setDate(deadlineDate.getDate() + 7);
    const deadline = deadlineDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    return {
      scheduledDate,
      startTime: currentTime,
      endTime,
      deadline,
      durationMinutes: 30
    };
  };

  // Helper function to calculate end time
  const calculateEndTime = useCallback((startTime: string, duration: number) => {
    if (!startTime) return '';
    const start = new Date(`2000-01-01T${startTime}`);
    start.setMinutes(start.getMinutes() + duration);
    return start.toTimeString().slice(0, 5);
  }, []);

  // Helper function to calculate deadline (7 days after scheduled date)
  const calculateDeadline = useCallback((scheduledDate: string) => {
    if (!scheduledDate) return '';
    const scheduleDate = new Date(scheduledDate);
    scheduleDate.setDate(scheduleDate.getDate() + 7);
    return scheduleDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  }, []);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classId: '',
    assignmentType: 'class' as 'class' | 'group' | 'individual',
    selectedGroups: [] as string[],
    selectedStudents: [] as string[],
    ...getDefaultValues()
  });

  // PDF upload state
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Search state
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Search filtering functions
  const filteredGroups = useMemo(() => {
    if (!groupSearchTerm.trim()) return groups;
    const searchLower = groupSearchTerm.toLowerCase();
    return groups.filter(group =>
      group.name.toLowerCase().includes(searchLower) ||
      group.leaderName?.toLowerCase().includes(searchLower) ||
      group.members?.some((member: any) =>
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchLower) ||
        member.studentId?.toLowerCase().includes(searchLower)
      )
    );
  }, [groups, groupSearchTerm]);

  const filteredStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) return students;
    const searchLower = studentSearchTerm.toLowerCase();
    return students.filter(student =>
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchLower) ||
      student.studentId?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower)
    );
  }, [students, studentSearchTerm]);



  // Fetch initial data when modal opens
  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (formData.classId) {
      fetchGroups();
      fetchStudents();
    } else {
      setGroups([]);
      setStudents([]);
    }
    // Clear search terms when class changes
    setGroupSearchTerm('');
    setStudentSearchTerm('');
  }, [formData.classId]);

  // Clear search terms when assignment type changes
  useEffect(() => {
    setGroupSearchTerm('');
    setStudentSearchTerm('');
  }, [formData.assignmentType]);

  // Auto-calculate end time when start time or duration changes
  useEffect(() => {
    if (formData.startTime && formData.durationMinutes) {
      const newEndTime = calculateEndTime(formData.startTime, formData.durationMinutes);
      if (newEndTime !== formData.endTime) {
        setFormData(prev => ({
          ...prev,
          endTime: newEndTime
        }));
      }
    }
  }, [formData.startTime, formData.durationMinutes, calculateEndTime]);



  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/classes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/groups?classId=${formData.classId}`, {
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
      const response = await fetch(`/api/users?role=student&classId=${formData.classId}`, {
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // Auto-update deadline when scheduled date changes
      if (field === 'scheduledDate') {
        newData.deadline = calculateDeadline(value);
      }

      return newData;
    });
  };

  const handleMultiSelect = (field: 'selectedGroups' | 'selectedStudents', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(id => id !== value)
        : [...prev[field], value]
    }));
  };



  const handleFileUpload = async (scheduleId: string) => {
    if (!assignmentFile) return null;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', assignmentFile);
      formData.append('scheduleId', scheduleId);
      formData.append('fileType', 'assignment_file');

      const token = localStorage.getItem('token');
      const response = await fetch('/api/schedules/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload assignment file');
      }

      return await response.json();
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      // Create the schedule first
      const scheduleData = {
        title: formData.title,
        description: formData.description,
        class_id: formData.classId,
        scheduled_date: formData.scheduledDate,
        start_time: formData.startTime,
        end_time: formData.endTime || calculateEndTime(formData.startTime, formData.durationMinutes),
        duration_minutes: formData.durationMinutes,
        deadline: formData.deadline,
        assignment_type: formData.assignmentType
      };

      const scheduleResponse = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(scheduleData)
      });

      if (!scheduleResponse.ok) {
        const errorData = await scheduleResponse.json();
        console.log('Schedule creation failed:', scheduleResponse.status, errorData);
        if (scheduleResponse.status === 409 && errorData.suggestedTimes) {
          // Handle scheduling conflict with suggestions
          const suggestions = errorData.suggestedTimes
            .map((time: any) => `${time.start_time}-${time.end_time}`)
            .join(', ');
          throw new Error(`Scheduling conflict: ${errorData.message || 'Time slot is already taken'}. Available times: ${suggestions}`);
        } else if (scheduleResponse.status === 409) {
          throw new Error(errorData.error || 'Scheduling conflict detected. Please choose a different time.');
        } else {
          throw new Error(errorData.error || 'Failed to create schedule');
        }
      }

      const scheduleResult = await scheduleResponse.json();
      const scheduleId = scheduleResult.schedule.id;

      // Upload assignment file if provided
      if (assignmentFile) {
        await handleFileUpload(scheduleId);
      }

      // Create assignments based on type
      console.log('Creating assignments for type:', formData.assignmentType);
      if (formData.assignmentType === 'class') {
        // Assign to entire class - create assignment for all students in the class
        const assignmentResponse = await fetch('/api/assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            schedule_id: scheduleId,
            class_id: formData.classId,
            assignment_type: 'class'
          })
        });

        if (!assignmentResponse.ok) {
          const errorData = await assignmentResponse.json();
          throw new Error(errorData.error || 'Failed to create class assignment');
        }
      } else if (formData.assignmentType === 'group' && formData.selectedGroups.length > 0) {
        for (const groupId of formData.selectedGroups) {
          const assignmentResponse = await fetch('/api/assignments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              schedule_id: scheduleId,
              group_id: groupId,
              assignment_type: 'group'
            })
          });

          if (!assignmentResponse.ok) {
            const errorData = await assignmentResponse.json();
            throw new Error(errorData.error || 'Failed to create group assignment');
          }
        }
      } else if (formData.assignmentType === 'individual' && formData.selectedStudents.length > 0) {
        for (const studentId of formData.selectedStudents) {
          const assignmentResponse = await fetch('/api/assignments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              schedule_id: scheduleId,
              user_id: studentId,
              assignment_type: 'individual'
            })
          });

          if (!assignmentResponse.ok) {
            const errorData = await assignmentResponse.json();
            throw new Error(errorData.error || 'Failed to create individual assignment');
          }
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating assignment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create assignment. Please try again.';
      showError('Creation Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal create-assignment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Practical Assignment</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-content">
          <div className="form-section">
            <h3>Assignment Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="title">Assignment Title *</label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                  placeholder="Enter assignment title"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter assignment description"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Class Selection</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="classId">Class *</label>
                <select
                  id="classId"
                  value={formData.classId}
                  onChange={(e) => handleInputChange('classId', e.target.value)}
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_code || cls.name || `${cls.grade} ${cls.stream} ${cls.section}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Assignment File (Optional)</h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="assignmentFile">Upload Assignment PDF</label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    id="assignmentFile"
                    accept=".pdf"
                    onChange={(e) => setAssignmentFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="assignmentFile" className="file-upload-label">
                    {assignmentFile ? (
                      <div className="file-selected">
                        <span className="file-icon">📄</span>
                        <span className="file-name">{assignmentFile.name}</span>
                        <span className="file-size">({(assignmentFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    ) : (
                      <div className="file-placeholder">
                        <span className="upload-icon">📤</span>
                        <span>Click to upload assignment PDF (max 10MB)</span>
                      </div>
                    )}
                  </label>
                  {assignmentFile && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => setAssignmentFile(null)}
                    >
                      Remove File
                    </button>
                  )}
                </div>
              </div>
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
                  checked={formData.assignmentType === 'class'}
                  onChange={(e) => handleInputChange('assignmentType', e.target.value)}
                />
                <span>Entire Class</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="assignmentType"
                  value="group"
                  checked={formData.assignmentType === 'group'}
                  onChange={(e) => handleInputChange('assignmentType', e.target.value)}
                />
                <span>Specific Groups</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="assignmentType"
                  value="individual"
                  checked={formData.assignmentType === 'individual'}
                  onChange={(e) => handleInputChange('assignmentType', e.target.value)}
                />
                <span>Individual Students</span>
              </label>
            </div>
          </div>

          {formData.assignmentType === 'group' && formData.classId && (
            <div className="form-section">
              <h3>Select Groups</h3>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search groups by name, leader, or member..."
                  value={groupSearchTerm}
                  onChange={(e) => setGroupSearchTerm(e.target.value)}
                  className="search-input"
                />
                {groupSearchTerm && (
                  <p className="search-results-count">
                    Showing {filteredGroups.length} of {groups.length} groups
                  </p>
                )}
              </div>
              <div className="selection-grid">
                {groups.length === 0 ? (
                  <p className="no-data-message">No groups found for this class. Groups may need to be created first.</p>
                ) : filteredGroups.length === 0 ? (
                  <p className="no-data-message">No groups match your search criteria.</p>
                ) : (
                  filteredGroups.map(group => (
                    <label key={group.id} className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={formData.selectedGroups.includes(group.id)}
                        onChange={() => handleMultiSelect('selectedGroups', group.id)}
                      />
                      <span>{group.name} ({group.member_count} members)</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {formData.assignmentType === 'individual' && formData.classId && (
            <div className="form-section">
              <h3>Select Students</h3>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search students by name, student ID, or email..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="search-input"
                />
                {studentSearchTerm && (
                  <p className="search-results-count">
                    Showing {filteredStudents.length} of {students.length} students
                  </p>
                )}
              </div>
              <div className="selection-grid">
                {students.length === 0 ? (
                  <p className="no-data-message">No students found for this class. Students may need to be enrolled first.</p>
                ) : filteredStudents.length === 0 ? (
                  <p className="no-data-message">No students match your search criteria.</p>
                ) : (
                  filteredStudents.map(student => (
                    <label key={student.id} className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={formData.selectedStudents.includes(student.id)}
                        onChange={() => handleMultiSelect('selectedStudents', student.id)}
                      />
                      <span>{student.firstName} {student.lastName} ({student.studentId})</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="form-section">
            <h3>Schedule & Deadline</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="scheduledDate">Schedule Date *</label>
                <input
                  type="date"
                  id="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="deadline">Deadline *</label>
                <input
                  type="datetime-local"
                  id="deadline"
                  value={formData.deadline}
                  onChange={(e) => handleInputChange('deadline', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="startTime">Start Time *</label>
                <input
                  type="time"
                  id="startTime"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="durationMinutes">Duration (minutes) *</label>
                <input
                  type="number"
                  id="durationMinutes"
                  value={formData.durationMinutes}
                  onChange={(e) => handleInputChange('durationMinutes', parseInt(e.target.value))}
                  min="30"
                  max="480"
                  step="15"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="endTime">End Time</label>
                <input
                  type="time"
                  id="endTime"
                  value={formData.endTime || calculateEndTime(formData.startTime, formData.durationMinutes)}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  placeholder="Auto-calculated"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <LabSyncProLogo size="small" animated={true} showText={false} />
                  Creating...
                </div>
              ) : (
                'Create Assignment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Assignment Modal Component
interface EditAssignmentModalProps {
  assignment: any;
  onClose: () => void;
  onSuccess: () => void;
}

const EditAssignmentModal: React.FC<EditAssignmentModalProps> = ({ assignment, onClose, onSuccess }) => {
  const { showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: assignment.schedule_title || '',
    description: assignment.schedule_description || '',
    scheduledDate: assignment.scheduled_date ? assignment.scheduled_date.split('T')[0] : '',
    startTime: assignment.start_time || '',
    endTime: assignment.end_time || '',
    deadline: assignment.deadline ? assignment.deadline.split('T')[0] : '',
    status: assignment.status || 'assigned'
  });

  // Helper function to calculate deadline (7 days after scheduled date)
  const calculateDeadline = useCallback((scheduledDate: string) => {
    if (!scheduledDate) return '';
    const scheduleDate = new Date(scheduledDate);
    scheduleDate.setDate(scheduleDate.getDate() + 7);
    return scheduleDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // Auto-update deadline when scheduled date changes
      if (field === 'scheduledDate') {
        newData.deadline = calculateDeadline(value);
      }

      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      // Update the schedule first
      const scheduleResponse = await fetch(`/api/schedules/${assignment.schedule_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          scheduled_date: formData.scheduledDate,
          start_time: formData.startTime,
          end_time: formData.endTime,
          deadline: formData.deadline
        })
      });

      if (!scheduleResponse.ok) {
        const errorData = await scheduleResponse.json();
        throw new Error(errorData.error || 'Failed to update schedule');
      }

      // Update the assignment status
      const assignmentResponse = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: formData.status
        })
      });

      if (!assignmentResponse.ok) {
        const errorData = await assignmentResponse.json();
        throw new Error(errorData.error || 'Failed to update assignment');
      }

      onSuccess();
    } catch (error) {
      console.error('Error updating assignment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update assignment. Please try again.';
      showError('Update Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal edit-assignment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Assignment</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-content">
          <div className="form-section">
            <h3>Assignment Information</h3>

            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="scheduledDate">Scheduled Date *</label>
                <input
                  type="date"
                  id="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="deadline">Deadline</label>
                <input
                  type="date"
                  id="deadline"
                  value={formData.deadline}
                  onChange={(e) => handleInputChange('deadline', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startTime">Start Time *</label>
                <input
                  type="time"
                  id="startTime"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="endTime">End Time *</label>
                <input
                  type="time"
                  id="endTime"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
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
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <LabSyncProLogo size="small" animated={true} showText={false} />
                  Updating...
                </div>
              ) : (
                'Update Assignment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Assignments;
