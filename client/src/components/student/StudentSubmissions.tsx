// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { submissionsAPI } from '../../services/api';
import './StudentSubmissions.css';

interface Assignment {
  id: string;
  assignmentId: string;
  title: string;
  description: string;
  dueDate: string;
  scheduledDate: string;
  scheduledDateFormatted?: string;
  status: string;
  assignmentStatus: string;
  assignmentType: string;
  className: string;
  instructorName: string;
  assignedAt: string;
  groupName?: string;
  type: 'individual' | 'group' | 'class';
  canAccessPdf?: boolean;
  canUpload?: boolean;
  isUpcoming?: boolean;
  pdfFileName?: string;
  submission?: {
    id: string | null;
    assignmentResponseFilename: string | null;
    outputTestFilename: string | null;
    submittedAt: string | null;
    isLocked: boolean;
    hasResponse: boolean;
    hasOutput: boolean;
    isComplete: boolean;
  };
}

interface Submission {
  id: string;
  scheduleId: string;
  title: string;
  submittedAt: string;
  status: string;
  files?: Array<{
    id: string;
    originalFilename: string;
    fileType: string;
    fileSize: number;
  }>;
}

interface UploadModalData {
  assignment: Assignment;
  fileType: 'assignment_response' | 'output_test';
}

const StudentSubmissions: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    data: UploadModalData | null;
  }>({
    isOpen: false,
    data: null
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'submitted' | 'cancelled' | 'history'>('current');

  // Helper function to format dates consistently as DD-MMM-YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Helper function to filter assignments by status
  const getFilteredAssignments = () => {
    switch (activeTab) {
      case 'current':
        return assignments.filter(a => a.status === 'upcoming' || a.status === 'in_progress');
      case 'submitted':
        return assignments.filter(a => a.status === 'completed');
      case 'cancelled':
        return assignments.filter(a => a.status === 'cancelled');
      default:
        return assignments;
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchSubmissions();
  }, []);

  // Update current datetime every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/assignments/student', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await submissionsAPI.getSubmissions();
      if (response.data?.submissions) {
        setSubmissions(response.data.submissions);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionForAssignment = (scheduleId: string) => {
    return submissions.find(sub => sub.scheduleId === scheduleId);
  };

  const openUploadModal = (assignment: Assignment, fileType: 'assignment_response' | 'output_test') => {
    setUploadModal({
      isOpen: true,
      data: { assignment, fileType }
    });
  };

  const submitAssignment = async (assignment: Assignment) => {
    if (!assignment.submission?.hasResponse || !assignment.submission?.hasOutput) {
      showNotification('Please upload both assignment response and output test files before submitting.', 'error');
      return;
    }

    try {
      const formData = new FormData();

      // Note: In a real implementation, you would need to get the actual files
      // For now, we'll assume the files are already uploaded and we're just marking as submitted

      const response = await fetch(`/api/assignments/submit/${assignment.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        showNotification('Assignment submitted successfully!', 'success');
        fetchAssignments(); // Refresh the assignments list
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to submit assignment', 'error');
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      showNotification('Failed to submit assignment', 'error');
    }
  };

  const downloadFile = async (assignmentId: string, fileType: 'assignment_response' | 'output_test') => {
    try {
      const response = await fetch(`/api/assignments/download/${assignmentId}/${fileType}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileType}_${assignmentId}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccess('File downloaded successfully');
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      showError('Failed to download file');
    }
  };

  const downloadAssignmentPDF = async (assignmentId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/assignments/created/${assignmentId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
        showSuccess('Assignment PDF downloaded successfully');
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to download assignment PDF');
      }
    } catch (error) {
      console.error('Error downloading assignment PDF:', error);
      showError('Failed to download assignment PDF');
    }
  };

  const closeUploadModal = () => {
    setUploadModal({ isOpen: false, data: null });
    setSelectedFile(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadModal.data) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('scheduleId', uploadModal.data.assignment.id); // This is the assignment distribution ID
      formData.append('fileType', uploadModal.data.fileType);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/submissions/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        showSuccess('File uploaded successfully');
        closeUploadModal();
        fetchSubmissions(); // Refresh submissions
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadLegacyFile = async (submissionId: string, filename: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/submissions/${submissionId}/files/${filename}`, {
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
        showNotification('File downloaded successfully', 'success');
      } else {
        showNotification('Failed to download file', 'error');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      showNotification('Failed to download file', 'error');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };



  if (loading) {
    return (
      <div className="student-submissions loading">
        <div className="loading-spinner">Loading assignments...</div>
      </div>
    );
  }

  return (
    <div className="student-submissions">
      <div className="submissions-header">
        <div className="header-content">
          <div className="title-section">
            <h1>My Assignments</h1>
            <p>Upload your assignment responses and view submission history</p>
          </div>
          <div className="datetime-display">
            <div className="current-time">
              <span className="time-label">Current Time:</span>
              <span className="time-value">
                {currentDateTime.toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                  timeZoneName: 'short'
                })}
              </span>
              <span className="timezone-info">
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'current' ? 'active' : ''}`}
          onClick={() => setActiveTab('current')}
        >
          📝 Current Assignments
        </button>
        <button
          className={`tab-button ${activeTab === 'submitted' ? 'active' : ''}`}
          onClick={() => setActiveTab('submitted')}
        >
          ✅ Submitted
        </button>
        <button
          className={`tab-button ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancelled')}
        >
          ❌ Cancelled
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📚 Submission History
        </button>
      </div>

      {/* Current Assignments Tab */}
      {(activeTab === 'current' || activeTab === 'submitted' || activeTab === 'cancelled') && (
        <div className="assignments-grid">
          {getFilteredAssignments().map((assignment) => {
            const getStatusBadgeClass = (status: string) => {
              switch (status) {
                case 'completed': return 'status-completed';
                case 'in_progress': return 'status-in-progress';
                case 'cancelled': return 'status-cancelled';
                case 'upcoming': return 'status-upcoming';
                default: return 'status-default';
              }
            };

            const getStatusIcon = (status: string) => {
              switch (status) {
                case 'completed': return '✅';
                case 'in_progress': return '⏳';
                case 'cancelled': return '❌';
                case 'upcoming': return '📅';
                default: return '📋';
              }
            };

            return (
              <div key={assignment.id} className="assignment-card">
                <div className="assignment-header">
                  <div className="assignment-title-section">
                    <span className="assignment-type-icon">
                      {assignment.assignmentType === 'individual' ? '👤' : assignment.assignmentType === 'group' ? '👥' : '🏫'}
                    </span>
                    <h3>{assignment.title}</h3>
                    <span className="assignment-type-badge">{assignment.assignmentType}</span>
                    {assignment.groupName && (
                      <span className="group-badge">👥 {assignment.groupName}</span>
                    )}
                  </div>
                  <span className={`assignment-status ${getStatusBadgeClass(assignment.status)}`}>
                    {getStatusIcon(assignment.status)} {assignment.status.toUpperCase()}
                  </span>
                </div>

                <div className="assignment-details">
                  <p className="description">{assignment.description}</p>
                  {assignment.status === 'upcoming' && assignment.scheduledDate && (
                    <div className="upcoming-notice">
                      <span className="upcoming-text">
                        📅 Available on: {new Date(assignment.scheduledDate).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZoneName: 'short'
                        })}
                      </span>
                      <span className="upcoming-description">
                        Assignment content will be accessible on the scheduled date.
                      </span>
                    </div>
                  )}
                  <div className="assignment-meta">
                    <span className="class">👥 {assignment.className}</span>
                    <span className="instructor">👨‍🏫 {assignment.instructorName}</span>
                    <span className="scheduled-date">📅 Scheduled: {new Date(assignment.scheduledDate).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZoneName: 'short'
                    })}</span>
                    <span className="due-date">⏰ Due: {new Date(assignment.dueDate).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZoneName: 'short'
                    })}</span>
                    {assignment.submission?.submittedAt && (
                      <span className="submitted">✅ Submitted: {new Date(assignment.submission.submittedAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short'
                      })}</span>
                    )}
                  </div>
                </div>

                {/* Assignment PDF Section */}
                {assignment.pdfFileName && assignment.canAccessPdf && (
                  <div className="assignment-pdf-section">
                    <h4>Assignment Instructions</h4>
                    <div className="pdf-download">
                      <div className="pdf-info">
                        <span className="pdf-icon">📄</span>
                        <span className="pdf-name">{assignment.pdfFileName}</span>
                      </div>
                      <button
                        className="download-btn"
                        onClick={() => downloadAssignmentPDF(assignment.assignmentId, assignment.pdfFileName!)}
                      >
                        📥 Download PDF
                      </button>
                    </div>
                  </div>
                )}

                <div className="submission-section">
                  <h4>Submission Status</h4>

                  {assignment.status === 'upcoming' ? (
                    <div className="upcoming-restriction">
                      <div className="restriction-notice">
                        <span className="restriction-icon">🔒</span>
                        <div className="restriction-text">
                          <p><strong>Assignment Not Yet Available</strong></p>
                          <p>This assignment will be available for submission on {new Date(assignment.scheduledDate).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZoneName: 'short'
                          })}.</p>
                          <p>Please check back after the scheduled date to access the assignment content and submit your work.</p>
                        </div>
                      </div>
                    </div>
                  ) : assignment.status === 'cancelled' ? (
                    <div className="cancelled-restriction">
                      <div className="restriction-notice">
                        <span className="restriction-icon">❌</span>
                        <div className="restriction-text">
                          <p><strong>Assignment Deadline Passed</strong></p>
                          <p>The deadline for this assignment has passed and submissions are no longer accepted.</p>
                        </div>
                      </div>
                    </div>
                  ) : assignment.status === 'completed' ? (
                    <div className="completed-submission">
                      <div className="completion-notice">
                        <span className="completion-icon">✅</span>
                        <div className="completion-text">
                          <p><strong>Assignment Completed</strong></p>
                          <p>Submitted on: {assignment.submission?.submittedAt ? formatDate(assignment.submission.submittedAt) : 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="submitted-files">
                        {assignment.submission?.assignmentResponseFilename && (
                          <div className="submitted-file">
                            <span className="file-icon">📄</span>
                            <span className="file-label">Response:</span>
                            <span className="file-name">{assignment.submission.assignmentResponseFilename}</span>
                            <button
                              className="download-btn"
                              onClick={() => downloadFile(assignment.id, 'assignment_response')}
                            >
                              📥 Download
                            </button>
                          </div>
                        )}
                        {assignment.submission?.outputTestFilename && (
                          <div className="submitted-file">
                            <span className="file-icon">🧪</span>
                            <span className="file-label">Output:</span>
                            <span className="file-name">{assignment.submission.outputTestFilename}</span>
                            <button
                              className="download-btn"
                              onClick={() => downloadFile(assignment.id, 'output_test')}
                            >
                              📥 Download
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="file-upload-section">
                      <div className="upload-item">
                        <div className="upload-header">
                          <span className="upload-label">📄 Assignment Response</span>
                          {assignment.submission?.hasResponse ? (
                            <span className="file-status uploaded">✅ Uploaded</span>
                          ) : (
                            <span className="file-status pending">⏳ Pending</span>
                          )}
                        </div>

                        {assignment.submission?.assignmentResponseFilename ? (
                          <div className="uploaded-file">
                            <span className="filename">{assignment.submission.assignmentResponseFilename}</span>
                          </div>
                        ) : assignment.canUpload ? (
                          <div>
                            <button
                              className="upload-btn"
                              onClick={() => openUploadModal(assignment, 'assignment_response')}
                            >
                              📤 Upload Response
                            </button>
                            {new Date(assignment.dueDate) < new Date() && (
                              <small style={{ display: 'block', fontSize: '12px', color: '#e67e22', marginTop: '4px' }}>
                                ⚠️ Deadline passed - Late submission
                              </small>
                            )}
                          </div>
                        ) : (
                          <div className="upload-disabled">
                            <span>Upload not available</span>
                            <small style={{ display: 'block', fontSize: '12px', color: '#666', marginTop: '4px' }}>
                              {new Date(assignment.dueDate) < new Date() ? 'Deadline passed' :
                               assignment.submission?.isLocked ? 'Submission locked' : 'Upload disabled'}
                            </small>
                          </div>
                        )}
                      </div>

                      <div className="upload-item">
                        <div className="upload-header">
                          <span className="upload-label">🧪 Output Test</span>
                          {assignment.submission?.hasOutput ? (
                            <span className="file-status uploaded">✅ Uploaded</span>
                          ) : (
                            <span className="file-status pending">⏳ Pending</span>
                          )}
                        </div>

                        {assignment.submission?.outputTestFilename ? (
                          <div className="uploaded-file">
                            <span className="filename">{assignment.submission.outputTestFilename}</span>
                          </div>
                        ) : assignment.canUpload ? (
                          <div>
                            <button
                              className="upload-btn"
                              onClick={() => openUploadModal(assignment, 'output_test')}
                            >
                              📤 Upload Output Test
                            </button>
                            {new Date(assignment.dueDate) < new Date() && (
                              <small style={{ display: 'block', fontSize: '12px', color: '#e67e22', marginTop: '4px' }}>
                                ⚠️ Deadline passed - Late submission
                              </small>
                            )}
                          </div>
                        ) : (
                          <div className="upload-disabled">
                            <span>Upload not available</span>
                            <small style={{ display: 'block', fontSize: '12px', color: '#666', marginTop: '4px' }}>
                              {new Date(assignment.dueDate) < new Date() ? 'Deadline passed' :
                               assignment.submission?.isLocked ? 'Submission locked' : 'Upload disabled'}
                            </small>
                          </div>
                        )}
                      </div>

                      {assignment.canUpload && assignment.submission?.hasResponse && assignment.submission?.hasOutput && (
                        <div className="submit-assignment">
                          <button
                            className="submit-btn"
                            onClick={() => submitAssignment(assignment)}
                          >
                            🚀 Submit Assignment
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {getFilteredAssignments().length === 0 && (
            <div className="no-assignments">
              <div className="no-assignments-icon">📝</div>
              <h3>
                {activeTab === 'current' && 'No current assignments'}
                {activeTab === 'submitted' && 'No submitted assignments'}
                {activeTab === 'cancelled' && 'No cancelled assignments'}
              </h3>
              <p>
                {activeTab === 'current' && 'You don\'t have any current assignments.'}
                {activeTab === 'submitted' && 'You haven\'t submitted any assignments yet.'}
                {activeTab === 'cancelled' && 'You don\'t have any cancelled assignments.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Submission History Tab */}
      {activeTab === 'history' && (
        <div className="submissions-history">
          <div className="history-header">
            <h2>Submission History</h2>
            <p>View all your past submissions and their status</p>
          </div>
          
          <div className="history-list">
            {submissions.length > 0 ? (
              submissions.map((submission) => {
                const assignment = assignments.find(a => a.scheduleId === submission.scheduleId);
                return (
                  <div key={submission.id} className="history-item">
                    <div className="history-header">
                      <div className="submission-info">
                        <h3>{submission.title}</h3>
                        <p className="assignment-title">
                          Assignment: {assignment?.title || 'Unknown Assignment'}
                        </p>
                        <div className="submission-meta">
                          <span>📅 Submitted: {formatDate(submission.submittedAt)}</span>
                          <span>📍 {assignment?.labName || 'N/A'}</span>
                          <span>👥 {assignment?.className || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="submission-status">
                        <span className={`status-badge ${submission.status}`}>
                          {submission.status}
                        </span>
                      </div>
                    </div>
                    
                    {submission.files && submission.files.length > 0 && (
                      <div className="submission-files">
                        <h4>Submitted Files:</h4>
                        <div className="files-list">
                          {submission.files.map((file) => (
                            <div key={file.id} className="file-item">
                              <div className="file-info">
                                <span className="file-icon">📄</span>
                                <div className="file-details">
                                  <span className="filename">{file.originalFilename}</span>
                                  <span className="file-meta">
                                    {file.fileType.replace('_', ' ')} • {formatFileSize(file.fileSize)}
                                  </span>
                                </div>
                              </div>
                              <button
                                className="download-btn"
                                onClick={() => downloadLegacyFile(submission.id, file.originalFilename)}
                              >
                                📥 Download
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="no-history">
                <div className="no-history-icon">📚</div>
                <h3>No Submission History</h3>
                <p>You haven't submitted any assignments yet. Complete assignments to see your submission history here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadModal.isOpen && uploadModal.data && (
        <div className="modal-overlay" onClick={closeUploadModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload {uploadModal.data.fileType.replace('_', ' ')}</h3>
              <button className="close-btn" onClick={closeUploadModal}>×</button>
            </div>
            
            <div className="modal-body">
              <p><strong>Assignment:</strong> {uploadModal.data.assignment.title}</p>
              <p><strong>File Type:</strong> {uploadModal.data.fileType.replace('_', ' ')}</p>
              
              <div className="file-input-section">
                <label className="file-input-label">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.zip"
                    onChange={handleFileSelect}
                    className="file-input"
                    style={{ display: 'none' }}
                  />
                  <div className="file-placeholder">
                    <span className="upload-icon">📁</span>
                    <div>
                      <p><strong>Click to select a file</strong></p>
                      <p>or drag and drop here</p>
                      <small>Supported formats: PDF, DOC, DOCX, TXT, ZIP (max 10MB)</small>
                    </div>
                  </div>
                </label>
                {selectedFile && (
                  <div className="selected-file">
                    <div className="file-details">
                      <span className="filename">📄 {selectedFile.name}</span>
                      <span className="filesize">Size: {formatFileSize(selectedFile.size)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="cancel-btn" onClick={closeUploadModal}>Cancel</button>
              <button 
                className="upload-btn" 
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSubmissions;
