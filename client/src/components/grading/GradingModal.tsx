import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import './GradingModal.css';

interface Submission {
  id: string;
  scheduleId: string;
  scheduleTitle: string;
  labName: string;
  className: string;
  studentName?: string;
  groupName?: string;
  submittedAt: string;
  files: FileUpload[];
}

interface FileUpload {
  id: string;
  originalFilename: string;
  fileType: 'assignment_response' | 'output_test';
  fileSize: number;
  uploadedAt: string;
}

interface Grade {
  id?: string;
  score: number;
  maxScore: number;
  gradeLetter: string;
  feedback: string;
}

interface GradeScale {
  minPercentage: number;
  maxPercentage: number;
  letter: string;
  gpa: number;
}

interface GradingModalProps {
  submission: Submission;
  onClose: () => void;
  onGradeSubmitted: () => void;
}

const GradingModal: React.FC<GradingModalProps> = ({ submission, onClose, onGradeSubmitted }) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [score, setScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(100);
  const [feedback, setFeedback] = useState<string>('');
  const [gradeLetter, setGradeLetter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [existingGrade, setExistingGrade] = useState<Grade | null>(null);

  // Standard grading scale
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
      const response = await fetch(`/api/grades/submission/${submission.id}`, {
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
          setMaxScore(grade.maxScore);
          setGradeLetter(grade.gradeLetter || '');
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
        ? `/api/grades/${existingGrade.id}`
        : '/api/grades';

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

  const downloadFile = async (fileId: string, filename: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/files/download/${fileId}`, {
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
        showError('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      showError('Failed to download file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

  return (
    <div className="modal-overlay">
      <div className="grading-modal">
        <div className="modal-header">
          <h3>
            {existingGrade ? '📊 Edit Grade' : '📊 Grade Submission'}
          </h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Submission Info */}
          <div className="submission-info">
            <h4>{submission.scheduleTitle}</h4>
            <div className="submission-meta">
              <div className="meta-row">
                <span className="label">Lab:</span>
                <span className="value">{submission.labName}</span>
              </div>
              <div className="meta-row">
                <span className="label">Class:</span>
                <span className="value">{submission.className}</span>
              </div>
              {submission.groupName && (
                <div className="meta-row">
                  <span className="label">Group:</span>
                  <span className="value">👥 {submission.groupName}</span>
                </div>
              )}
              {submission.studentName && (
                <div className="meta-row">
                  <span className="label">Student:</span>
                  <span className="value">👤 {submission.studentName}</span>
                </div>
              )}
              <div className="meta-row">
                <span className="label">Submitted:</span>
                <span className="value">{formatDate(submission.submittedAt)}</span>
              </div>
            </div>
          </div>

          {/* Files Section */}
          <div className="files-section">
            <h5>📁 Submitted Files</h5>
            {submission.files && submission.files.length > 0 ? (
              <div className="files-list">
                {submission.files.map((file) => (
                  <div key={file.id} className="file-item">
                    <div className="file-info">
                      <span className="file-icon">
                        {file.fileType === 'assignment_response' ? '📄' : '🧪'}
                      </span>
                      <div className="file-details">
                        <span className="filename">{file.originalFilename}</span>
                        <span className="file-meta">
                          {file.fileType === 'assignment_response' ? 'Assignment Response' : 'Output Test'} • 
                          {formatFileSize(file.fileSize)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="download-btn"
                      onClick={() => downloadFile(file.id, file.originalFilename)}
                    >
                      📥 Download
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-files">
                <p>No files submitted</p>
              </div>
            )}
          </div>

          {/* Grading Section */}
          <div className="grading-section">
            <h5>📊 Grade Assignment</h5>
            
            <div className="grade-inputs">
              <div className="score-inputs">
                <div className="input-group">
                  <label htmlFor="score">Score</label>
                  <input
                    id="score"
                    type="number"
                    min="0"
                    max={maxScore}
                    step="0.5"
                    value={score}
                    onChange={(e) => setScore(parseFloat(e.target.value) || 0)}
                    className="score-input"
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="maxScore">Max Score</label>
                  <input
                    id="maxScore"
                    type="number"
                    min="1"
                    step="0.5"
                    value={maxScore}
                    onChange={(e) => setMaxScore(parseFloat(e.target.value) || 100)}
                    className="max-score-input"
                  />
                </div>
              </div>

              <div className="grade-display">
                <div className="percentage">
                  {percentage.toFixed(1)}%
                </div>
                <div className="letter-grade">
                  {gradeLetter}
                </div>
              </div>
            </div>

            <div className="feedback-section">
              <label htmlFor="feedback">Feedback</label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide feedback for the student..."
                rows={4}
                className="feedback-textarea"
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmitGrade}
            disabled={loading || score < 0 || score > maxScore}
          >
            {loading ? 'Saving...' : (existingGrade ? 'Update Grade' : 'Submit Grade')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GradingModal;
