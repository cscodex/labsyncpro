import React, { useState, useEffect } from 'react';
import { assignmentGradesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ExportButton from '../common/ExportButton';
import GradeScaleModal from './GradeScaleModal';
import GradeAnalytics from './GradeAnalytics';
import LoadingSpinner from '../common/LoadingSpinner';
import './Grades.css';

interface Grade {
  id: string;
  submissionId: string;
  studentName: string;
  studentId: string;
  scheduleTitle: string;
  labName: string;
  className: string;
  submissionType: 'file' | 'text' | 'mixed';
  submittedAt: string;
  files: string[];
  textContent?: string;
  score?: number;
  maxScore: number;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string;
  status: 'pending' | 'graded' | 'reviewed';
  groupName?: string;
}

interface GradingModalProps {
  grade: Grade;
  onClose: () => void;
  onSave: (gradeData: { score: number; feedback: string }) => void;
}

const GradingModal: React.FC<GradingModalProps> = ({ grade, onClose, onSave }) => {
  const [score, setScore] = useState(grade.score || 0);
  const [feedback, setFeedback] = useState(grade.feedback || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ score, feedback });
      onClose();
    } catch (error) {
      console.error('Error saving grade:', error);
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return '#27ae60';
    if (percentage >= 80) return '#2ecc71';
    if (percentage >= 70) return '#f39c12';
    if (percentage >= 60) return '#e67e22';
    return '#e74c3c';
  };

  return (
    <div className="modal-overlay">
      <div className="grading-modal">
        <div className="modal-header">
          <h2>Grade Submission</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="submission-info">
            <h3>{grade.scheduleTitle}</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Student:</label>
                <span>{grade.studentName} ({grade.studentId})</span>
              </div>
              <div className="info-item">
                <label>Lab:</label>
                <span>{grade.labName}</span>
              </div>
              <div className="info-item">
                <label>Class:</label>
                <span>{grade.className}</span>
              </div>
              {grade.groupName && (
                <div className="info-item">
                  <label>Group:</label>
                  <span>{grade.groupName}</span>
                </div>
              )}
              <div className="info-item">
                <label>Submitted:</label>
                <span>{new Date(grade.submittedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {grade.files.length > 0 && (
            <div className="submission-files">
              <h4>Submitted Files:</h4>
              <div className="file-list">
                {grade.files.map((file, index) => (
                  <div key={index} className="file-item">
                    <span className="file-name">{file}</span>
                    <button className="btn btn-sm">Download</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {grade.textContent && (
            <div className="submission-text">
              <h4>Text Submission:</h4>
              <div className="text-content">
                {grade.textContent}
              </div>
            </div>
          )}

          <div className="grading-section">
            <div className="score-input">
              <label htmlFor="score">Score:</label>
              <div className="score-controls">
                <input
                  type="number"
                  id="score"
                  min="0"
                  max={grade.maxScore}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="score-field"
                  disabled
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
                <span className="max-score">/ {grade.maxScore}</span>
                <div
                  className="score-percentage"
                  style={{ color: getScoreColor(score, grade.maxScore) }}
                >
                  {Math.round((score / grade.maxScore) * 100)}%
                </div>
              </div>
            </div>

            <div className="feedback-input">
              <label htmlFor="feedback">Feedback:</label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide detailed feedback for the student..."
                rows={6}
                className="feedback-field"
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={true}
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
          >
            Editing Disabled
          </button>
        </div>
      </div>
    </div>
  );
};

const Grades: React.FC = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'graded'>('pending');
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGradeScaleModal, setShowGradeScaleModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Demo data
  const demoGrades: Grade[] = [
    {
      id: '1',
      submissionId: 'sub1',
      studentName: 'John Doe',
      studentId: '12345678',
      scheduleTitle: 'Web Development Practical',
      labName: 'Lab 1',
      className: '11th Non-Medical A',
      submissionType: 'mixed',
      submittedAt: '2024-01-14T16:30:00Z',
      files: ['index.html', 'style.css', 'script.js'],
      textContent: 'This is my web development project implementing a responsive portfolio website.',
      maxScore: 100,
      status: 'pending',
      groupName: 'Group Alpha'
    },
    {
      id: '2',
      submissionId: 'sub2',
      studentName: 'Jane Smith',
      studentId: '12345679',
      scheduleTitle: 'Database Design Lab',
      labName: 'Lab 2',
      className: '12th Non-Medical A',
      submissionType: 'file',
      submittedAt: '2024-01-10T14:20:00Z',
      files: ['database_schema.sql', 'queries.sql'],
      score: 85,
      maxScore: 100,
      feedback: 'Good work on the database design. Consider adding more indexes for better performance.',
      gradedAt: '2024-01-12T10:00:00Z',
      gradedBy: 'John Smith',
      status: 'graded',
      groupName: 'Group Beta'
    }
  ];

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        setLoading(true);
        const response = await assignmentGradesAPI.getGrades();
        console.log('Assignment Grades API Response:', response);
        // The assignment grades API returns { grades: [], pagination: {} }
        const apiGrades = response.data?.grades || [];

        // Transform API data to match our interface
        const transformedGrades: Grade[] = apiGrades.map((grade: any) => ({
          id: grade.id,
          submissionId: grade.assignment_submission_id,
          studentName: grade.student_name,
          studentId: grade.student_id,
          scheduleTitle: grade.assignment_title,
          labName: 'Lab', // Assignment-based system doesn't have lab concept
          className: grade.class_name,
          submissionType: 'mixed', // Assignment submissions are always mixed
          submittedAt: grade.submitted_at,
          files: [
            grade.assignment_response_filename,
            grade.output_test_filename
          ].filter(Boolean), // Remove null/undefined files
          textContent: '', // Assignment submissions don't have text content
          score: grade.score,
          maxScore: grade.max_score || 100,
          feedback: grade.feedback,
          gradedAt: grade.graded_at,
          gradedBy: grade.instructor_name,
          status: grade.score !== null ? 'graded' : 'pending',
          groupName: '' // Assignment submissions don't have groups
        }));

        setGrades(transformedGrades);
      } catch (error) {
        console.error('Error fetching assignment grades:', error);
        console.warn('Using demo data for grades');
        setGrades(demoGrades);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, []);

  const handleGradeSubmission = async (gradeData: { score: number; feedback: string }) => {
    if (!selectedGrade) return;

    try {
      // In a real app, this would call the API
      // await gradeAPI.updateGrade(selectedGrade.id, gradeData);

      // Update local state for demo
      setGrades(prev => prev.map(grade =>
        grade.id === selectedGrade.id
          ? {
              ...grade,
              score: gradeData.score,
              feedback: gradeData.feedback,
              status: 'graded' as const,
              gradedAt: new Date().toISOString(),
              gradedBy: user?.email || 'Current User'
            }
          : grade
      ));
    } catch (error) {
      console.error('Error updating grade:', error);
    }
  };

  const filteredGrades = Array.isArray(grades) ? grades.filter(grade => {
    const matchesFilter = filter === 'all' || grade.status === filter;
    const matchesSearch = searchTerm === '' ||
      grade.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.studentId?.includes(searchTerm) ||
      grade.scheduleTitle?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  }) : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'graded': return '#27ae60';
      case 'reviewed': return '#3498db';
      default: return '#95a5a6';
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return '#27ae60';
    if (percentage >= 80) return '#2ecc71';
    if (percentage >= 70) return '#f39c12';
    if (percentage >= 60) return '#e67e22';
    return '#e74c3c';
  };

  if (loading) {
    return (
      <LoadingSpinner
        size="large"
        message="Loading grades..."
      />
    );
  }

  return (
    <div className="grades">
      <div className="grades-header">
        <div className="header-content">
          <h1>Grading System</h1>
          <p>Review student submissions (Editing disabled)</p>
          <div className="notice-banner" style={{
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '4px',
            padding: '8px 12px',
            marginTop: '8px',
            fontSize: '14px',
            color: '#856404'
          }}>
            ⚠️ Grade editing is currently disabled. You can view submissions but cannot modify grades or feedback.
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-outline"
            onClick={() => setShowAnalytics(true)}
          >
            📊 Analytics
          </button>
          <button
            className="btn btn-outline"
            onClick={() => setShowGradeScaleModal(true)}
            disabled
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
          >
            ⚙️ Grade Scale
          </button>
          <ExportButton
            exportType="grades"
            filters={{}}
            size="md"
            variant="outline"
          >
            📤 Export Grades
          </ExportButton>
          <ExportButton
            exportType="submissions"
            filters={{}}
            size="md"
            variant="outline"
          >
            📄 Export Submissions
          </ExportButton>
        </div>
      </div>

      <div className="grades-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search by student name, ID, or assignment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending ({grades.filter(g => g.status === 'pending').length})
          </button>
          <button
            className={`filter-tab ${filter === 'graded' ? 'active' : ''}`}
            onClick={() => setFilter('graded')}
          >
            Graded ({grades.filter(g => g.status === 'graded').length})
          </button>
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({grades.length})
          </button>
        </div>
      </div>

      <div className="grades-table-container">
        <table className="grades-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Assignment</th>
              <th>Class</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Score</th>
              <th>Grade</th>
              <th>Feedback</th>
              <th>Graded By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGrades.map((grade) => (
              <tr key={grade.id} className="grade-row">
                <td className="student-cell">
                  <div className="student-info">
                    <div className="student-name">{grade.studentName}</div>
                    <div className="student-id">{grade.studentId}</div>
                  </div>
                </td>
                <td className="assignment-cell">
                  <div className="assignment-title">{grade.scheduleTitle}</div>
                  {grade.files.length > 0 && (
                    <div className="file-count">{grade.files.length} files</div>
                  )}
                </td>
                <td className="class-cell">
                  <div>{grade.className}</div>
                  {grade.groupName && <div className="group-name">{grade.groupName}</div>}
                </td>
                <td className="submitted-cell">
                  {new Date(grade.submittedAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </td>
                <td className="status-cell">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(grade.status) }}
                  >
                    {grade.status.toUpperCase()}
                  </span>
                </td>
                <td className="score-cell">
                  {grade.status === 'graded' && grade.score !== undefined ? (
                    <div className="score-display">
                      <span
                        className="score"
                        style={{ color: getScoreColor(grade.score, grade.maxScore) }}
                      >
                        {grade.score}/{grade.maxScore}
                      </span>
                      <div className="percentage">
                        ({Math.round((grade.score / grade.maxScore) * 100)}%)
                      </div>
                    </div>
                  ) : (
                    <span className="no-score">-</span>
                  )}
                </td>
                <td className="grade-cell">
                  {grade.status === 'graded' && grade.score !== undefined ? (
                    <span className="grade-letter">
                      {/* Calculate grade letter based on percentage */}
                      {(() => {
                        const percentage = (grade.score / grade.maxScore) * 100;
                        if (percentage >= 97) return 'A+';
                        if (percentage >= 93) return 'A';
                        if (percentage >= 90) return 'A-';
                        if (percentage >= 87) return 'B+';
                        if (percentage >= 83) return 'B';
                        if (percentage >= 80) return 'B-';
                        if (percentage >= 77) return 'C+';
                        if (percentage >= 73) return 'C';
                        if (percentage >= 70) return 'C-';
                        if (percentage >= 67) return 'D+';
                        if (percentage >= 63) return 'D';
                        if (percentage >= 60) return 'D-';
                        return 'F';
                      })()}
                    </span>
                  ) : (
                    <span className="no-grade">-</span>
                  )}
                </td>
                <td className="feedback-cell">
                  {grade.feedback ? (
                    <div className="feedback-preview" title={grade.feedback}>
                      {grade.feedback.length > 50
                        ? `${grade.feedback.substring(0, 50)}...`
                        : grade.feedback}
                    </div>
                  ) : (
                    <span className="no-feedback">-</span>
                  )}
                </td>
                <td className="graded-by-cell">
                  {grade.status === 'graded' && grade.gradedBy ? (
                    <div className="grader-info">
                      <div className="grader-name">{grade.gradedBy}</div>
                      <div className="graded-date">
                        {new Date(grade.gradedAt!).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short'
                        })}
                      </div>
                    </div>
                  ) : (
                    <span className="no-grader">-</span>
                  )}
                </td>
                <td className="actions-cell">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => setSelectedGrade(grade)}
                    title="View submission details"
                    disabled
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                  >
                    👁️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredGrades.length === 0 && (
        <div className="no-grades">
          <h3>No submissions found</h3>
          <p>There are no submissions matching your current filter and search criteria.</p>
        </div>
      )}

      {selectedGrade && (
        <GradingModal
          grade={selectedGrade}
          onClose={() => setSelectedGrade(null)}
          onSave={handleGradeSubmission}
        />
      )}

      <GradeScaleModal
        isOpen={showGradeScaleModal}
        onClose={() => setShowGradeScaleModal(false)}
        onSave={() => {
          // Refresh grades if needed
          fetchGrades();
        }}
      />

      <GradeAnalytics
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
      />
    </div>
  );
};

export default Grades;
