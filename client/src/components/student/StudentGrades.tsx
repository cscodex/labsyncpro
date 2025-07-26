import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { gradesAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import './StudentGrades.css';

interface Grade {
  id: string;
  assignmentTitle: string;
  assignmentType: string;
  grade: number;
  maxGrade: number;
  percentage: number;
  submittedAt: string;
  gradedAt: string;
  feedback?: string;
  className: string;
  labName: string;
  instructorName: string;
  status: 'graded' | 'pending' | 'late';
}

interface GradeStats {
  totalAssignments: number;
  gradedAssignments: number;
  averageGrade: number;
  highestGrade: number;
  lowestGrade: number;
  pendingGrades: number;
}

const StudentGrades: React.FC = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  
  const [grades, setGrades] = useState<Grade[]>([]);
  const [stats, setStats] = useState<GradeStats>({
    totalAssignments: 0,
    gradedAssignments: 0,
    averageGrade: 0,
    highestGrade: 0,
    lowestGrade: 0,
    pendingGrades: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'graded' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'grade' | 'assignment'>('date');

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const response = await gradesAPI.getGrades({ limit: 100 });
      
      if (response.data?.grades) {
        const gradesData = response.data.grades.map((grade: any) => ({
          id: grade.id,
          assignmentTitle: grade.assignment_title || grade.title,
          assignmentType: grade.assignment_type || 'assignment',
          grade: grade.grade,
          maxGrade: grade.max_grade || 100,
          percentage: Math.round((grade.grade / (grade.max_grade || 100)) * 100),
          submittedAt: grade.submitted_at,
          gradedAt: grade.graded_at || grade.created_at,
          feedback: grade.feedback,
          className: grade.class_name || 'N/A',
          labName: grade.lab_name || 'N/A',
          instructorName: grade.instructor_name || 'N/A',
          status: grade.grade !== null ? 'graded' : 'pending'
        }));
        
        setGrades(gradesData);
        calculateStats(gradesData);
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
      showError('Failed to fetch grades');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (gradesData: Grade[]) => {
    const gradedGrades = gradesData.filter(g => g.status === 'graded' && g.grade !== null);
    const pendingGrades = gradesData.filter(g => g.status === 'pending');
    
    const percentages = gradedGrades.map(g => g.percentage);
    const averageGrade = percentages.length > 0 
      ? Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length)
      : 0;
    
    setStats({
      totalAssignments: gradesData.length,
      gradedAssignments: gradedGrades.length,
      averageGrade,
      highestGrade: percentages.length > 0 ? Math.max(...percentages) : 0,
      lowestGrade: percentages.length > 0 ? Math.min(...percentages) : 0,
      pendingGrades: pendingGrades.length,
    });
  };

  const getFilteredGrades = () => {
    let filtered = grades;
    
    if (filter === 'graded') {
      filtered = grades.filter(g => g.status === 'graded');
    } else if (filter === 'pending') {
      filtered = grades.filter(g => g.status === 'pending');
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'grade':
          return (b.percentage || 0) - (a.percentage || 0);
        case 'assignment':
          return a.assignmentTitle.localeCompare(b.assignmentTitle);
        case 'date':
        default:
          return new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime();
      }
    });
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return '#10b981'; // Green
    if (percentage >= 80) return '#3b82f6'; // Blue
    if (percentage >= 70) return '#f59e0b'; // Yellow
    if (percentage >= 60) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getGradeLetter = (percentage: number) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  if (loading) {
    return (
      <LoadingSpinner
        size="large"
        message="Loading your grades..."
      />
    );
  }

  return (
    <div className="student-grades">
      <div className="page-header">
        <h1>My Grades</h1>
        <p>View your assignment grades and academic progress</p>
      </div>

      {/* Grade Statistics */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{stats.averageGrade}%</h3>
              <p>Average Grade</p>
            </div>
          </div>
          
          <div className="stat-card success">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{stats.gradedAssignments}</h3>
              <p>Graded Assignments</p>
            </div>
          </div>
          
          <div className="stat-card warning">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <h3>{stats.pendingGrades}</h3>
              <p>Pending Grades</p>
            </div>
          </div>
          
          <div className="stat-card info">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <h3>{stats.highestGrade}%</h3>
              <p>Highest Grade</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="controls-section">
        <div className="filter-controls">
          <label>Filter:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">All Grades</option>
            <option value="graded">Graded Only</option>
            <option value="pending">Pending Only</option>
          </select>
        </div>
        
        <div className="sort-controls">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="date">Date</option>
            <option value="grade">Grade</option>
            <option value="assignment">Assignment</option>
          </select>
        </div>
      </div>

      {/* Grades List */}
      <div className="grades-section">
        {getFilteredGrades().length > 0 ? (
          <div className="grades-list">
            {getFilteredGrades().map((grade) => (
              <div key={grade.id} className="grade-card">
                <div className="grade-header">
                  <div className="assignment-info">
                    <h3>{grade.assignmentTitle}</h3>
                    <div className="assignment-meta">
                      <span>📍 {grade.labName}</span>
                      <span>👥 {grade.className}</span>
                      <span>👨‍🏫 {grade.instructorName}</span>
                    </div>
                  </div>
                  
                  {grade.status === 'graded' ? (
                    <div className="grade-display">
                      <div 
                        className="grade-circle"
                        style={{ backgroundColor: getGradeColor(grade.percentage) }}
                      >
                        <span className="grade-letter">{getGradeLetter(grade.percentage)}</span>
                        <span className="grade-percentage">{grade.percentage}%</span>
                      </div>
                      <div className="grade-details">
                        <span className="grade-score">{grade.grade}/{grade.maxGrade}</span>
                        <span className="grade-date">
                          Graded: {new Date(grade.gradedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="pending-grade">
                      <div className="pending-indicator">
                        <span>⏳</span>
                        <span>Pending</span>
                      </div>
                      <span className="submitted-date">
                        Submitted: {new Date(grade.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
                
                {grade.feedback && (
                  <div className="grade-feedback">
                    <h4>Instructor Feedback:</h4>
                    <p>{grade.feedback}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📈</div>
            <h2>No Grades Found</h2>
            <p>
              {filter === 'all' 
                ? "You don't have any grades yet. Complete and submit assignments to see your grades here."
                : `No ${filter} grades found. Try changing the filter.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentGrades;
