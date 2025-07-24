import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import './GradeAnalytics.css';

interface GradeStatistics {
  totalGrades: number;
  averagePercentage: number;
  minPercentage: number;
  maxPercentage: number;
  stdDeviation: number;
  totalStudents: number;
  totalAssignments: number;
}

interface GradeDistribution {
  gradeLetter: string;
  count: number;
  percentage: number;
}

interface TopStudent {
  studentName: string;
  studentId: string;
  classCode: string;
  averagePercentage: number;
  totalAssignments: number;
  highestGrade: number;
  lowestGrade: number;
}

interface AssignmentPerformance {
  assignmentTitle: string;
  assignmentId: string;
  totalSubmissions: number;
  averagePercentage: number;
  minPercentage: number;
  maxPercentage: number;
  aGrades: number;
  bGrades: number;
  cGrades: number;
  belowCGrades: number;
}

interface ClassPerformance {
  classCode: string;
  classId: string;
  totalGrades: number;
  averagePercentage: number;
  totalStudents: number;
  totalAssignments: number;
}

interface AnalyticsData {
  statistics: GradeStatistics;
  gradeDistribution: GradeDistribution[];
  topStudents: TopStudent[];
  assignmentPerformance: AssignmentPerformance[];
  classPerformance: ClassPerformance[];
}

interface GradeAnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Class {
  id: string;
  classCode: string;
}

interface Assignment {
  id: string;
  name: string;
}

const GradeAnalytics: React.FC<GradeAnalyticsProps> = ({ isOpen, onClose }) => {
  const { showNotification } = useNotification();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'assignments' | 'classes'>('overview');
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filters, setFilters] = useState({
    classId: '',
    assignmentId: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchFilterData();
      fetchAnalytics();
    }
  }, [isOpen, filters]);

  const fetchFilterData = async () => {
    try {
      // Fetch classes
      const classesResponse = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (classesResponse.ok) {
        const classesData = await classesResponse.json();
        setClasses(classesData.classes || []);
      }

      // Fetch assignments
      const assignmentsResponse = await fetch('/api/assignments/created?status=published', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        setAssignments(assignmentsData.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.classId) params.append('classId', filters.classId);
      if (filters.assignmentId) params.append('assignmentId', filters.assignmentId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await fetch(`/api/assignment-grades/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      } else {
        showNotification('Failed to fetch analytics data', 'error');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showNotification('Error fetching analytics data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return '#27ae60';
    if (percentage >= 80) return '#2ecc71';
    if (percentage >= 70) return '#f39c12';
    if (percentage >= 60) return '#e67e22';
    return '#e74c3c';
  };

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 80) return 'Good';
    if (percentage >= 70) return 'Satisfactory';
    if (percentage >= 60) return 'Needs Improvement';
    return 'Poor';
  };

  if (!isOpen) return null;

  return (
    <div className="grade-analytics-overlay">
      <div className="grade-analytics-modal">
        <div className="modal-header">
          <h2>Grade Analytics & Reports</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="analytics-filters">
          <div className="filter-group">
            <label>Class:</label>
            <select
              value={filters.classId}
              onChange={(e) => setFilters(prev => ({ ...prev, classId: e.target.value }))}
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.classCode}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Assignment:</label>
            <select
              value={filters.assignmentId}
              onChange={(e) => setFilters(prev => ({ ...prev, assignmentId: e.target.value }))}
            >
              <option value="">All Assignments</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>From:</label>
            <input 
              type="date" 
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>
          
          <div className="filter-group">
            <label>To:</label>
            <input 
              type="date" 
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>
        </div>

        <div className="analytics-tabs">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            👥 Students
          </button>
          <button 
            className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            📝 Assignments
          </button>
          <button 
            className={`tab-btn ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => setActiveTab('classes')}
          >
            🏫 Classes
          </button>
        </div>

        <div className="analytics-content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading analytics...</p>
            </div>
          ) : analyticsData ? (
            <>
              {activeTab === 'overview' && (
                <div className="overview-tab">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon">📈</div>
                      <div className="stat-content">
                        <h3>{analyticsData.statistics.averagePercentage?.toFixed(1)}%</h3>
                        <p>Average Grade</p>
                      </div>
                    </div>
                    
                    <div className="stat-card">
                      <div className="stat-icon">👥</div>
                      <div className="stat-content">
                        <h3>{analyticsData.statistics.totalStudents}</h3>
                        <p>Total Students</p>
                      </div>
                    </div>
                    
                    <div className="stat-card">
                      <div className="stat-icon">📝</div>
                      <div className="stat-content">
                        <h3>{analyticsData.statistics.totalGrades}</h3>
                        <p>Total Grades</p>
                      </div>
                    </div>
                    
                    <div className="stat-card">
                      <div className="stat-icon">📊</div>
                      <div className="stat-content">
                        <h3>{analyticsData.statistics.totalAssignments}</h3>
                        <p>Assignments</p>
                      </div>
                    </div>
                  </div>

                  <div className="charts-section">
                    <div className="chart-container">
                      <h3>Grade Distribution</h3>
                      <div className="grade-distribution">
                        {analyticsData.gradeDistribution.map((grade) => (
                          <div key={grade.gradeLetter} className="grade-bar">
                            <div className="grade-label">{grade.gradeLetter}</div>
                            <div className="bar-container">
                              <div 
                                className="bar-fill" 
                                style={{ 
                                  width: `${grade.percentage}%`,
                                  backgroundColor: getGradeColor(grade.percentage)
                                }}
                              ></div>
                            </div>
                            <div className="grade-count">{grade.count} ({grade.percentage}%)</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="performance-summary">
                      <h3>Performance Summary</h3>
                      <div className="summary-stats">
                        <div className="summary-item">
                          <span>Highest Grade:</span>
                          <span style={{ color: getGradeColor(analyticsData.statistics.maxPercentage) }}>
                            {analyticsData.statistics.maxPercentage?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="summary-item">
                          <span>Lowest Grade:</span>
                          <span style={{ color: getGradeColor(analyticsData.statistics.minPercentage) }}>
                            {analyticsData.statistics.minPercentage?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="summary-item">
                          <span>Standard Deviation:</span>
                          <span>{analyticsData.statistics.stdDeviation?.toFixed(2)}</span>
                        </div>
                        <div className="summary-item">
                          <span>Performance Level:</span>
                          <span style={{ color: getGradeColor(analyticsData.statistics.averagePercentage) }}>
                            {getPerformanceLevel(analyticsData.statistics.averagePercentage)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'students' && (
                <div className="students-tab">
                  <h3>Top Performing Students</h3>
                  <div className="students-table">
                    <div className="table-header">
                      <div>Rank</div>
                      <div>Student</div>
                      <div>Class</div>
                      <div>Average</div>
                      <div>Assignments</div>
                      <div>Range</div>
                    </div>
                    {analyticsData.topStudents.map((student, index) => (
                      <div key={student.studentId} className="table-row">
                        <div className="rank">#{index + 1}</div>
                        <div className="student-info">
                          <div className="student-name">{student.studentName}</div>
                          <div className="student-id">{student.studentId}</div>
                        </div>
                        <div>{student.classCode}</div>
                        <div style={{ color: getGradeColor(student.averagePercentage) }}>
                          {student.averagePercentage.toFixed(1)}%
                        </div>
                        <div>{student.totalAssignments}</div>
                        <div className="grade-range">
                          <span style={{ color: getGradeColor(student.lowestGrade) }}>
                            {student.lowestGrade.toFixed(1)}%
                          </span>
                          {' - '}
                          <span style={{ color: getGradeColor(student.highestGrade) }}>
                            {student.highestGrade.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'assignments' && (
                <div className="assignments-tab">
                  <h3>Assignment Performance Analysis</h3>
                  <div className="assignments-table">
                    <div className="table-header">
                      <div>Assignment</div>
                      <div>Submissions</div>
                      <div>Average</div>
                      <div>Range</div>
                      <div>Grade Distribution</div>
                    </div>
                    {analyticsData.assignmentPerformance.map((assignment) => (
                      <div key={assignment.assignmentId} className="table-row">
                        <div className="assignment-info">
                          <div className="assignment-title">{assignment.assignmentTitle}</div>
                        </div>
                        <div>{assignment.totalSubmissions}</div>
                        <div style={{ color: getGradeColor(assignment.averagePercentage) }}>
                          {assignment.averagePercentage.toFixed(1)}%
                        </div>
                        <div className="grade-range">
                          <span style={{ color: getGradeColor(assignment.minPercentage) }}>
                            {assignment.minPercentage.toFixed(1)}%
                          </span>
                          {' - '}
                          <span style={{ color: getGradeColor(assignment.maxPercentage) }}>
                            {assignment.maxPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="grade-distribution-mini">
                          <div className="mini-bar">
                            <span className="grade-count a-grade">A: {assignment.aGrades}</span>
                            <span className="grade-count b-grade">B: {assignment.bGrades}</span>
                            <span className="grade-count c-grade">C: {assignment.cGrades}</span>
                            <span className="grade-count below-c-grade">Below C: {assignment.belowCGrades}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'classes' && (
                <div className="classes-tab">
                  <h3>Class Performance Comparison</h3>
                  <div className="classes-table">
                    <div className="table-header">
                      <div>Class</div>
                      <div>Students</div>
                      <div>Assignments</div>
                      <div>Total Grades</div>
                      <div>Average Performance</div>
                    </div>
                    {analyticsData.classPerformance.map((classData) => (
                      <div key={classData.classId} className="table-row">
                        <div className="class-code">{classData.classCode}</div>
                        <div>{classData.totalStudents}</div>
                        <div>{classData.totalAssignments}</div>
                        <div>{classData.totalGrades}</div>
                        <div className="performance-indicator">
                          <div
                            className="performance-bar"
                            style={{
                              width: `${classData.averagePercentage}%`,
                              backgroundColor: getGradeColor(classData.averagePercentage)
                            }}
                          ></div>
                          <span style={{ color: getGradeColor(classData.averagePercentage) }}>
                            {classData.averagePercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-data">
              <p>No analytics data available</p>
            </div>
          )}
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

export default GradeAnalytics;
