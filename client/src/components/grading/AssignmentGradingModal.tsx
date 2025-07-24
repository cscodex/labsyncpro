import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import './AssignmentGradingModal.css';

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
}

interface AssignmentGrade {
  id?: string;
  score: number;
  maxScore: number;
  gradeLetter: string;
  percentage: number;
  feedback: string;
  rubricData?: any;
  gradedAt?: string;
  instructorName?: string;
}

interface GradeScale {
  minPercentage: number;
  maxPercentage: number;
  letter: string;
  gpa: number;
}

interface AssignmentGradingModalProps {
  submission: AssignmentSubmission;
  onClose: () => void;
  onGradeSubmitted: () => void;
}

const AssignmentGradingModal: React.FC<AssignmentGradingModalProps> = ({
  submission,
  onClose,
  onGradeSubmitted
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [score, setScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(100);
  const [gradeLetter, setGradeLetter] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [existingGrade, setExistingGrade] = useState<AssignmentGrade | null>(null);
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

  // Grade scale for automatic letter grade calculation
  const gradeScale: GradeScale[] = [
    { minPercentage: 97, maxPercentage: 100, letter: 'A+', gpa: 4.0 },
    { minPercentage: 93, maxPercentage: 96, letter: 'A', gpa: 4.0 },
    { minPercentage: 90, maxPercentage: 92, letter: 'A-', gpa: 3.7 },
    { minPercentage: 87, maxPercentage: 89, letter: 'B+', gpa: 3.3 },
    { minPercentage: 83, maxPercentage: 86, letter: 'B', gpa: 3.0 },
    { minPercentage: 80, maxPercentage: 82, letter: 'B-', gpa: 2.7 },
    { minPercentage: 77, maxPercentage: 79, letter: 'C+', gpa: 2.3 },
    { minPercentage: 73, maxPercentage: 76, letter: 'C', gpa: 2.0 },
    { minPercentage: 70, maxPercentage: 72, letter: 'C-', gpa: 1.7 },
    { minPercentage: 67, maxPercentage: 69, letter: 'D+', gpa: 1.3 },
    { minPercentage: 63, maxPercentage: 66, letter: 'D', gpa: 1.0 },
    { minPercentage: 60, maxPercentage: 62, letter: 'D-', gpa: 0.7 },
    { minPercentage: 0, maxPercentage: 59, letter: 'F', gpa: 0.0 }
  ];

  useEffect(() => {
    fetchExistingGrade();
  }, [submission.id]);

  useEffect(() => {
    // Auto-calculate grade letter when score changes
    if (score > 0 && maxScore > 0) {
      const percentage = (score / maxScore) * 100;
      const grade = gradeScale.find(g => percentage >= g.minPercentage && percentage <= g.maxPercentage);
      setGradeLetter(grade?.letter || 'F');
    }
  }, [score, maxScore]);

  const fetchExistingGrade = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/assignment-grades/submission/${submission.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.grade) {
          const grade = data.grade;
          setExistingGrade(grade);
          setScore(grade.score);
          setMaxScore(grade.max_score);
          setGradeLetter(grade.grade_letter || '');
          setFeedback(grade.feedback || '');
        }
      }
    } catch (error) {
      console.error('Error fetching existing grade:', error);
    }
  };

  const handleSubmitGrade = async () => {
    if (score < 0 || score > maxScore) {
      showError('Score must be between 0 and max score');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const method = existingGrade ? 'PUT' : 'POST';
      const url = existingGrade 
        ? `/api/assignment-grades/${existingGrade.id}`
        : '/api/assignment-grades';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submissionId: submission.id,
          score,
          maxScore,
          gradeLetter,
          feedback
        })
      });

      if (response.ok) {
        showSuccess(existingGrade ? 'Grade updated successfully' : 'Grade submitted successfully');
        onGradeSubmitted();
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit grade');
      }
    } catch (error) {
      console.error('Error submitting grade:', error);
      showError(error instanceof Error ? error.message : 'Failed to submit grade');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewFile = (filename: string, fileType: 'assignment_response' | 'output_test') => {
    const fileUrl = `/api/submissions/download/${submission.assignmentDistributionId}/${fileType}?t=${Date.now()}`;
    const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
    
    setPreviewModal({
      isOpen: true,
      fileUrl,
      fileName: filename,
      fileType: fileExtension
    });
  };

  const closePreviewModal = () => {
    setPreviewModal({
      isOpen: false,
      fileUrl: '',
      fileName: '',
      fileType: ''
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return '#4CAF50'; // Green
    if (percentage >= 80) return '#8BC34A'; // Light Green
    if (percentage >= 70) return '#FFC107'; // Amber
    if (percentage >= 60) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="grading-modal" onClick={(e) => e.stopPropagation()}>
          <div className="grading-modal-header">
            <h2>Grade Assignment Submission</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          <div className="grading-modal-content">
            {/* Submission Info */}
            <div className="submission-info">
              <div className="info-section">
                <h3>Assignment Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Assignment:</label>
                    <span>{submission.assignmentTitle}</span>
                  </div>
                  <div className="info-item">
                    <label>Class:</label>
                    <span>{submission.className}</span>
                  </div>
                  <div className="info-item">
                    <label>Type:</label>
                    <span className="assignment-type">{submission.assignmentType}</span>
                  </div>
                  <div className="info-item">
                    <label>Deadline:</label>
                    <span>{formatDate(submission.deadline)}</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h3>Student Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Student:</label>
                    <span>{submission.studentName}</span>
                  </div>
                  <div className="info-item">
                    <label>Student ID:</label>
                    <span>{submission.studentId}</span>
                  </div>
                  <div className="info-item">
                    <label>Email:</label>
                    <span>{submission.studentEmail}</span>
                  </div>
                  <div className="info-item">
                    <label>Submitted:</label>
                    <span>{formatDate(submission.submittedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submitted Files */}
            <div className="submitted-files">
              <h3>Submitted Files</h3>
              <div className="files-grid">
                {submission.assignmentResponseFilename && (
                  <div className="file-item">
                    <div className="file-info">
                      <span className="file-icon">📄</span>
                      <div className="file-details">
                        <span className="file-name">{submission.assignmentResponseFilename}</span>
                        <span className="file-type">Assignment Response</span>
                      </div>
                    </div>
                    <div className="file-actions">
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => handlePreviewFile(submission.assignmentResponseFilename!, 'assignment_response')}
                      >
                        👁️ Preview
                      </button>
                      <a 
                        href={`/api/submissions/download/${submission.assignmentDistributionId}/assignment_response`}
                        className="btn btn-outline btn-sm"
                        download
                      >
                        📥 Download
                      </a>
                    </div>
                  </div>
                )}

                {submission.outputTestFilename && (
                  <div className="file-item">
                    <div className="file-info">
                      <span className="file-icon">📊</span>
                      <div className="file-details">
                        <span className="file-name">{submission.outputTestFilename}</span>
                        <span className="file-type">Output/Test</span>
                      </div>
                    </div>
                    <div className="file-actions">
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => handlePreviewFile(submission.outputTestFilename!, 'output_test')}
                      >
                        👁️ Preview
                      </button>
                      <a 
                        href={`/api/submissions/download/${submission.assignmentDistributionId}/output_test`}
                        className="btn btn-outline btn-sm"
                        download
                      >
                        📥 Download
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Grading Section */}
            <div className="grading-section">
              <h3>Grade Assignment</h3>
              
              <div className="grade-inputs">
                <div className="score-inputs">
                  <div className="input-group">
                    <label htmlFor="score">Score:</label>
                    <input
                      type="number"
                      id="score"
                      min="0"
                      max={maxScore}
                      step="0.5"
                      value={score}
                      onChange={(e) => setScore(parseFloat(e.target.value) || 0)}
                      className="score-input"
                    />
                  </div>
                  
                  <div className="input-group">
                    <label htmlFor="maxScore">Max Score:</label>
                    <input
                      type="number"
                      id="maxScore"
                      min="1"
                      step="0.5"
                      value={maxScore}
                      onChange={(e) => setMaxScore(parseFloat(e.target.value) || 100)}
                      className="max-score-input"
                    />
                  </div>
                </div>

                <div className="grade-display">
                  <div 
                    className="grade-circle"
                    style={{ backgroundColor: getGradeColor(percentage) }}
                  >
                    <span className="grade-letter">{gradeLetter}</span>
                    <span className="grade-percentage">{percentage}%</span>
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="gradeLetter">Grade Letter:</label>
                <input
                  type="text"
                  id="gradeLetter"
                  value={gradeLetter}
                  onChange={(e) => setGradeLetter(e.target.value)}
                  className="grade-letter-input"
                  placeholder="e.g., A, B+, C-"
                />
              </div>

              <div className="input-group">
                <label htmlFor="feedback">Feedback:</label>
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="feedback-textarea"
                  placeholder="Provide detailed feedback for the student..."
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="grading-modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSubmitGrade}
              disabled={loading}
            >
              {loading ? 'Saving...' : (existingGrade ? 'Update Grade' : 'Submit Grade')}
            </button>
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewModal.isOpen && (
        <div className="modal-overlay" onClick={closePreviewModal}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <h3>File Preview: {previewModal.fileName}</h3>
              <button className="close-btn" onClick={closePreviewModal}>×</button>
            </div>
            <div className="preview-modal-content">
              {previewModal.fileType === 'pdf' ? (
                <iframe
                  src={previewModal.fileUrl}
                  title={previewModal.fileName}
                  width="100%"
                  height="600px"
                  style={{ border: 'none' }}
                />
              ) : ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(previewModal.fileType) ? (
                <img
                  src={previewModal.fileUrl}
                  alt={previewModal.fileName}
                  style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
                />
              ) : (
                <div className="unsupported-preview">
                  <p>Preview not available for this file type.</p>
                  <a 
                    href={previewModal.fileUrl}
                    className="btn btn-primary"
                    download
                  >
                    📥 Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AssignmentGradingModal;
