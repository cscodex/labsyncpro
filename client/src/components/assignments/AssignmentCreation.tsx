import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import Pagination from '../common/Pagination';
import './Assignments.css';

interface Assignment {
  id: string;
  name: string;
  description: string;
  pdfFile?: File;
  pdfFileName?: string;
  pdfFileSize?: number;
  creationDate: string;
  createdBy: string;
  instructorName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const AssignmentCreation: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/assignments/created', {
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

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setShowEditModal(true);
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/assignments/created/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showSuccess('Assignment Deleted', 'Assignment has been deleted successfully');
        fetchAssignments();
      } else {
        const errorData = await response.json();
        showError('Delete Failed', errorData.error || 'Failed to delete assignment');
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      showError('Delete Failed', 'Failed to delete assignment. Please try again.');
    }
  };

  // Filter assignments based on search and filters
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || assignment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAssignments = filteredAssignments.slice(startIndex, startIndex + itemsPerPage);



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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadPDF = async (assignmentId: string, fileName: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/assignments/created/${assignmentId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      showError('Download Failed', 'Failed to download the PDF file');
    }
  };



  if (loading) {
    return (
      <div className="assignments">
        <div className="loading-container">
          <div className="loading-spinner">Loading assignments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="assignments">
      <div className="assignments-header">
        <h1>Assignment Creation</h1>
        <p>Create and manage assignments with PDF files. Use Assignment Management to assign them to classes, groups, or individuals.</p>
      </div>

      {/* Create New Assignment */}
      {(user?.role === 'instructor' || user?.role === 'admin') && (
        <div className="create-assignment-section">
          <div className="create-assignment-header">
            <h3>Create New Assignment</h3>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              + New Assignment
            </button>
          </div>
          <p className="create-assignment-note">
            Create assignments with PDF files and descriptions. After creation, use <strong>Assignment Management</strong> to assign them to specific classes, groups, or students.
          </p>
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
          <label htmlFor="statusFilter">Filter by Status:</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="assignments-table-container">
        <table className="assignments-table">
          <thead>
            <tr>
              <th>Assignment Name</th>
              <th>Description</th>
              <th>PDF File</th>
              <th>Created Date</th>
              <th>Updated Date</th>
              <th>Created By</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAssignments.length === 0 ? (
              <tr>
                <td colSpan={8} className="no-assignments">
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
                      <h4>{assignment.name}</h4>
                    </div>
                  </td>
                  <td>
                    <div className="description-cell">
                      {assignment.description ? (
                        assignment.description.length > 100
                          ? assignment.description.substring(0, 100) + '...'
                          : assignment.description
                      ) : 'No description'}
                    </div>
                  </td>
                  <td>
                    {assignment.pdfFileName ? (
                      <div className="file-info">
                        <div className="file-name">{assignment.pdfFileName}</div>
                        {assignment.pdfFileSize && (
                          <small className="file-size">{formatFileSize(assignment.pdfFileSize)}</small>
                        )}
                        <button
                          className="btn btn-sm btn-outline-primary download-btn"
                          onClick={() => handleDownloadPDF(assignment.id, assignment.pdfFileName)}
                          title="Download PDF"
                        >
                          <span className="download-icon">⬇️</span> Download
                        </button>
                      </div>
                    ) : (
                      <span className="no-file">No file</span>
                    )}
                  </td>
                  <td>{formatDateTime(assignment.createdAt)}</td>
                  <td>{formatDateTime(assignment.updatedAt)}</td>
                  <td>{assignment.instructorName}</td>
                  <td>
                    <div className="badge-container">
                      <span
                        className={`status-badge ${assignment.status.toLowerCase()}`}
                      >
                        {assignment.status.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="assignment-actions">
                    {(user?.role === 'instructor' || user?.role === 'admin') && (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleEditAssignment(assignment)}
                          title="Edit Assignment"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteAssignment(assignment.id)}
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

// Create Assignment Modal Component
interface CreateAssignmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  onClose,
  onSuccess
}) => {
  const { showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft' as 'draft' | 'published' | 'archived'
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (file.type !== 'application/pdf') {
        showError('Invalid File Type', 'Please select a PDF file.');
        return;
      }

      // Check file size (10MB = 10 * 1024 * 1024 bytes)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        showError('File Too Large', 'File size must be less than 10MB.');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('status', formData.status);

      if (selectedFile) {
        formDataToSend.append('pdf_file', selectedFile);
      }

      const response = await fetch('/api/assignments/created', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create assignment');
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
          <h2>Create New Assignment</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-content">
          <div className="form-section">
            <h3>Assignment Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Assignment Name *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  placeholder="Enter assignment name"
                />
              </div>



              <div className="form-group full-width">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter assignment description"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>PDF File Upload</h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="pdfFile">PDF File (Max 10MB)</label>
                <input
                  type="file"
                  id="pdfFile"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="file-input"
                />
                {selectedFile && (
                  <div className="file-preview">
                    <div className="file-info">
                      <span className="file-name">📄 {selectedFile.name}</span>
                      <span className="file-size">({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => setSelectedFile(null)}
                    >
                      Remove
                    </button>
                  </div>
                )}
                <small className="form-help">
                  Upload a PDF file containing the assignment instructions (maximum 10MB)
                </small>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Assignment Status</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
                <small className="form-help">
                  Draft assignments can be edited. Published assignments are available for assignment to classes.
                </small>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Assignment Modal Component
interface EditAssignmentModalProps {
  assignment: Assignment;
  onClose: () => void;
  onSuccess: () => void;
}

const EditAssignmentModal: React.FC<EditAssignmentModalProps> = ({
  assignment,
  onClose,
  onSuccess
}) => {
  const { showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: assignment.name || '',
    description: assignment.description || '',
    status: assignment.status || 'draft'
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (file.type !== 'application/pdf') {
        showError('Invalid File Type', 'Please select a PDF file.');
        return;
      }

      // Check file size (10MB = 10 * 1024 * 1024 bytes)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        showError('File Too Large', 'File size must be less than 10MB.');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('status', formData.status);

      if (selectedFile) {
        formDataToSend.append('pdf_file', selectedFile);
      }

      const response = await fetch(`/api/assignments/created/${assignment.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
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
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="edit-name">Assignment Name *</label>
                <input
                  type="text"
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  placeholder="Enter assignment name"
                />
              </div>



              <div className="form-group full-width">
                <label htmlFor="edit-description">Description</label>
                <textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter assignment description"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>PDF File Upload</h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="edit-pdfFile">PDF File (Max 10MB)</label>
                {assignment.pdfFileName && (
                  <div className="current-file">
                    <p><strong>Current file:</strong> {assignment.pdfFileName}</p>
                    {assignment.pdfFileSize && (
                      <small>Size: {(assignment.pdfFileSize / (1024 * 1024)).toFixed(2)} MB</small>
                    )}
                  </div>
                )}
                <input
                  type="file"
                  id="edit-pdfFile"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="file-input"
                />
                {selectedFile && (
                  <div className="file-preview">
                    <div className="file-info">
                      <span className="file-name">📄 {selectedFile.name}</span>
                      <span className="file-size">({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => setSelectedFile(null)}
                    >
                      Remove
                    </button>
                  </div>
                )}
                <small className="form-help">
                  {assignment.pdfFileName
                    ? 'Upload a new PDF file to replace the current one (maximum 10MB)'
                    : 'Upload a PDF file containing the assignment instructions (maximum 10MB)'
                  }
                </small>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Assignment Status</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="edit-status">Status</label>
                <select
                  id="edit-status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
                <small className="form-help">
                  Draft assignments can be edited. Published assignments are available for assignment to classes.
                </small>
              </div>
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

export default AssignmentCreation;
