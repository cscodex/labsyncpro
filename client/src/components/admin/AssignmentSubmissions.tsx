import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import './AssignmentSubmissions.css';

interface AssignmentSubmission {
  id: string;
  assignmentDistributionId: string;
  userId: string;
  assignmentResponseFilename?: string;
  outputTestFilename?: string;
  submittedAt: string;
  updatedAt: string;
  isLocked: boolean;
  // Assignment details
  assignmentTitle: string;
  assignmentDescription: string;
  className: string;
  assignmentType: string;
  deadline: string;
  scheduledDate: string;
  // Student details
  studentName: string;
  studentEmail: string;
  studentId: string;
  // Group details (if applicable)
  groupName?: string;
  // Grade details (if graded)
  grade?: {
    id: string;
    score: number;
    maxScore: number;
    gradeLetter: string;
    percentage: number;
    feedback: string;
    gradedAt: string;
    instructorName: string;
  };
}

interface InlineGradeEdit {
  submissionId: string;
  score: string;
  maxScore: string;
  feedback: string;
}

const AssignmentSubmissions: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [editingGrades, setEditingGrades] = useState<Map<string, InlineGradeEdit>>(new Map());
  const [savingGrades, setSavingGrades] = useState<Set<string>>(new Set());
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
    fileType: string;
  }>({
    isOpen: false,
    fileUrl: '',
    fileName: '',
    fileType: ''
  });

  useEffect(() => {
    fetchSubmissions();
    fetchClasses();
  }, []);

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (previewModal.fileUrl) {
        window.URL.revokeObjectURL(previewModal.fileUrl);
      }
    };
  }, [previewModal.fileUrl]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/admin/assignment-submissions?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
        setTotalSubmissions(data.total || 0);
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        showNotification('Failed to fetch submissions', 'error');
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      showNotification('Error fetching submissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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

  // Inline grading functions
  const startEditingGrade = (submission: AssignmentSubmission) => {
    const newEdit: InlineGradeEdit = {
      submissionId: submission.id,
      score: submission.grade?.score?.toString() || '',
      maxScore: submission.grade?.maxScore?.toString() || '100',
      feedback: submission.grade?.feedback || ''
    };

    setEditingGrades(prev => new Map(prev.set(submission.id, newEdit)));
  };

  const updateGradeEdit = (submissionId: string, field: keyof InlineGradeEdit, value: string) => {
    setEditingGrades(prev => {
      const current = prev.get(submissionId);
      if (current) {
        const updated = { ...current, [field]: value };
        return new Map(prev.set(submissionId, updated));
      }
      return prev;
    });
  };

  const saveGrade = async (submissionId: string) => {
    const gradeEdit = editingGrades.get(submissionId);
    if (!gradeEdit) return;

    const score = parseFloat(gradeEdit.score);
    const maxScore = parseFloat(gradeEdit.maxScore);

    if (isNaN(score) || isNaN(maxScore) || score < 0 || maxScore <= 0 || score > maxScore) {
      showNotification('Please enter valid score and max score values', 'error');
      return;
    }

    setSavingGrades(prev => new Set(prev.add(submissionId)));

    try {
      const response = await fetch('/api/assignment-grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          submissionId: submissionId,
          score: score,
          maxScore: maxScore,
          feedback: gradeEdit.feedback
        })
      });

      if (response.ok) {
        showNotification('Grade saved successfully', 'success');
        setEditingGrades(prev => {
          const newMap = new Map(prev);
          newMap.delete(submissionId);
          return newMap;
        });
        fetchSubmissions(); // Refresh to get updated grade data
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to save grade', 'error');
      }
    } catch (error) {
      console.error('Error saving grade:', error);
      showNotification('Error saving grade', 'error');
    } finally {
      setSavingGrades(prev => {
        const newSet = new Set(prev);
        newSet.delete(submissionId);
        return newSet;
      });
    }
  };

  const cancelEditingGrade = (submissionId: string) => {
    setEditingGrades(prev => {
      const newMap = new Map(prev);
      newMap.delete(submissionId);
      return newMap;
    });
  };

  const downloadFile = async (submissionId: string, fileType: 'assignment_response' | 'output_test') => {
    try {
      const response = await fetch(`/api/admin/assignment-submissions/${submissionId}/download/${fileType}`, {
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
        a.download = `${fileType}_${submissionId}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification('File downloaded successfully', 'success');
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to download file', 'error');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      showNotification('Error downloading file', 'error');
    }
  };

  const previewFile = async (submissionId: string, fileType: 'assignment_response' | 'output_test') => {
    try {
      const response = await fetch(`/api/admin/assignment-submissions/${submissionId}/download/${fileType}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        // Get the content-disposition header to extract filename
        const contentDisposition = response.headers.get('content-disposition');
        let fileName = `${fileType}.pdf`;
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
          if (fileNameMatch) {
            fileName = fileNameMatch[1];
          }
        }

        setPreviewModal({
          isOpen: true,
          fileUrl: url,
          fileName: fileName,
          fileType: blob.type
        });
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to preview file', 'error');
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      showNotification('Error previewing file', 'error');
    }
  };

  const closePreviewModal = () => {
    if (previewModal.fileUrl) {
      window.URL.revokeObjectURL(previewModal.fileUrl);
    }
    setPreviewModal({
      isOpen: false,
      fileUrl: '',
      fileName: '',
      fileType: ''
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubmissionStatus = (submission: AssignmentSubmission) => {
    if (!submission) {
      return { status: 'pending', label: 'Pending', className: 'status-pending' };
    }

    const hasResponse = !!submission.assignmentResponseFilename;
    const hasOutput = !!submission.outputTestFilename;
    const deadline = submission.deadline ? new Date(submission.deadline) : new Date();
    const now = new Date();

    if (hasResponse && hasOutput) {
      return { status: 'completed', label: 'Completed', className: 'status-completed' };
    } else if (hasResponse || hasOutput) {
      return { status: 'partial', label: 'Partial', className: 'status-partial' };
    } else if (now > deadline) {
      return { status: 'overdue', label: 'Overdue', className: 'status-overdue' };
    } else {
      return { status: 'pending', label: 'Pending', className: 'status-pending' };
    }
  };

  // Debug logging
  console.log('Current submissions state:', submissions);
  console.log('Submissions length:', submissions.length);
  if (submissions.length > 0) {
    console.log('First submission:', submissions[0]);
  }

  // Filter submissions
  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch =
      (submission.assignmentTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (submission.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (submission.studentEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (submission.studentId || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = classFilter === 'all' || submission.className === classFilter;

    const status = getSubmissionStatus(submission).status;
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });



  if (loading) {
    return (
      <div className="assignment-submissions-loading">
        <div className="loading-spinner"></div>
        <p>Loading assignment submissions...</p>
      </div>
    );
  }

  return (
    <div className="assignment-submissions">
      <div className="assignment-submissions-header">
        <h1>📄 Assignment Submissions</h1>
        <p>View and manage student assignment submissions</p>
      </div>

      <div className="assignment-submissions-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search by assignment, student name, email, or ID..."
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
            <option value="all">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.name}>{cls.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      <div className="submissions-stats">
        <div className="stat-card">
          <span className="stat-number">{filteredSubmissions.length}</span>
          <span className="stat-label">Total Submissions</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">
            {filteredSubmissions.filter(s => getSubmissionStatus(s).status === 'completed').length}
          </span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">
            {filteredSubmissions.filter(s => getSubmissionStatus(s).status === 'pending').length}
          </span>
          <span className="stat-label">Pending</span>
        </div>
      </div>

      <div className="assignment-submissions-table-container">
        <table className="assignment-submissions-table">
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Student</th>
              <th>Class</th>
              <th>Type</th>
              <th>Deadline</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Grade</th>
              <th>Files</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td colSpan={9} className="no-submissions">
                  <div className="no-data">
                    <h3>No submissions found</h3>
                    <p>There are no assignment submissions matching your current filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredSubmissions.map((submission) => {
                const status = getSubmissionStatus(submission);
                return (
                  <tr key={submission.id} className="submission-row">
                    <td className="assignment-cell">
                      <div className="assignment-info">
                        <span className="assignment-title">{submission.assignmentTitle || '-'}</span>
                        {submission.groupName && (
                          <span className="group-badge">Group: {submission.groupName}</span>
                        )}
                      </div>
                    </td>
                    <td className="student-cell">
                      <div className="student-info">
                        <span className="student-name">{submission.studentName || '-'}</span>
                        <span className="student-id">({submission.studentId || '-'})</span>
                      </div>
                    </td>
                    <td className="class-cell">{submission.className || '-'}</td>
                    <td className="type-cell">
                      <span className="assignment-type-badge">{submission.assignmentType || '-'}</span>
                    </td>
                    <td className="deadline-cell">{formatDate(submission.deadline)}</td>
                    <td className="submitted-cell">
                      {submission.submittedAt ? formatDate(submission.submittedAt) : '-'}
                    </td>
                    <td className="status-cell">
                      <span className={`status-badge ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="grade-cell">
                      {editingGrades.has(submission.id) ? (
                        <div className="inline-grade-edit">
                          <div className="grade-inputs">
                            <input
                              type="number"
                              className="score-input"
                              placeholder="Score"
                              value={editingGrades.get(submission.id)?.score || ''}
                              onChange={(e) => updateGradeEdit(submission.id, 'score', e.target.value)}
                              min="0"
                              step="0.01"
                            />
                            <span className="score-separator">/</span>
                            <input
                              type="number"
                              className="max-score-input"
                              placeholder="Max"
                              value={editingGrades.get(submission.id)?.maxScore || ''}
                              onChange={(e) => updateGradeEdit(submission.id, 'maxScore', e.target.value)}
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <textarea
                            className="feedback-input"
                            placeholder="Feedback (optional)"
                            value={editingGrades.get(submission.id)?.feedback || ''}
                            onChange={(e) => updateGradeEdit(submission.id, 'feedback', e.target.value)}
                            rows={2}
                          />
                          <div className="grade-actions">
                            <button
                              className="save-grade-btn"
                              onClick={() => saveGrade(submission.id)}
                              disabled={savingGrades.has(submission.id)}
                            >
                              {savingGrades.has(submission.id) ? '💾' : '✅'}
                            </button>
                            <button
                              className="cancel-grade-btn"
                              onClick={() => cancelEditingGrade(submission.id)}
                              disabled={savingGrades.has(submission.id)}
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grade-display-container">
                          {submission.grade ? (
                            <div className="grade-info">
                              <span className="grade-display">
                                {submission.grade.gradeLetter} ({submission.grade.percentage}%)
                              </span>
                              <span className="grade-score">
                                {submission.grade.score}/{submission.grade.maxScore}
                              </span>
                              {submission.grade.feedback && (
                                <span className="grade-feedback" title={submission.grade.feedback}>
                                  💬
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="no-grade">Not graded</span>
                          )}
                          <button
                            className="edit-grade-btn"
                            onClick={() => startEditingGrade(submission)}
                            title={submission.grade ? 'Edit Grade' : 'Add Grade'}
                          >
                            {submission.grade ? '✏️' : '📝'}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="files-cell">
                      <div className="file-indicators">
                        {submission.assignmentResponseFilename && (
                          <span className="file-indicator response" title="Assignment Response">📄</span>
                        )}
                        {submission.outputTestFilename && (
                          <span className="file-indicator output" title="Output Test">🧪</span>
                        )}
                        {!submission.assignmentResponseFilename && !submission.outputTestFilename && (
                          <span className="no-files">No files</span>
                        )}
                      </div>
                    </td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        {submission.assignmentResponseFilename && (
                          <>
                            <button
                              className="action-btn download-btn"
                              onClick={() => downloadFile(submission.assignmentDistributionId, 'assignment_response')}
                              title="Download Response"
                            >
                              📥
                            </button>
                            <button
                              className="action-btn preview-btn"
                              onClick={() => previewFile(submission.assignmentDistributionId, 'assignment_response')}
                              title="Preview Response"
                            >
                              👁️
                            </button>
                          </>
                        )}
                        {submission.outputTestFilename && (
                          <>
                            <button
                              className="action-btn download-btn"
                              onClick={() => downloadFile(submission.assignmentDistributionId, 'output_test')}
                              title="Download Output"
                            >
                              📥
                            </button>
                            <button
                              className="action-btn preview-btn"
                              onClick={() => previewFile(submission.assignmentDistributionId, 'output_test')}
                              title="Preview Output"
                            >
                              👁️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      {previewModal.isOpen && (
        <div className="modal-overlay" onClick={closePreviewModal}>
          <div className="modal-content preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📄 File Preview: {previewModal.fileName}</h3>
              <button className="modal-close-btn" onClick={closePreviewModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {previewModal.fileType === 'application/pdf' ? (
                <iframe
                  src={previewModal.fileUrl}
                  width="100%"
                  height="600px"
                  style={{ border: 'none' }}
                  title="PDF Preview"
                />
              ) : previewModal.fileType.startsWith('image/') ? (
                <img
                  src={previewModal.fileUrl}
                  alt="File Preview"
                  style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
                />
              ) : (
                <div className="unsupported-preview">
                  <p>📄 Preview not available for this file type</p>
                  <p>File type: {previewModal.fileType}</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = previewModal.fileUrl;
                      link.download = previewModal.fileName;
                      link.click();
                    }}
                  >
                    📥 Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AssignmentSubmissions;
