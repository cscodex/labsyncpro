import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { submissionsAPI, gradesAPI, groupsAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import './StudentDashboard.css';

interface StudentStats {
  totalAssignments: number;
  pendingSubmissions: number;
  submittedAssignments: number;
  averageGrade: number;
  recentGrades: number;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  type: 'individual' | 'group' | 'class';
  status: 'pending' | 'submitted' | 'graded';
  className: string;
  labName: string;
}

interface Grade {
  id: string;
  assignmentTitle: string;
  grade: number;
  maxGrade: number;
  submittedAt: string;
  gradedAt: string;
  feedback?: string;
}

interface GroupInfo {
  id: string;
  name: string;
  className: string;
  memberCount: number;
  isLeader: boolean;
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
    role: 'leader' | 'member';
  }>;
}

interface SeatAssignment {
  id: string;
  scheduleId: string;
  seatNumber: number;
  labName: string;
  labLocation: string;
  scheduleTitle: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  className: string;
  assignedAt: string;
  computerNumber?: number;
  computerName?: string;
  computerGroupId?: string;
  computerGroupName?: string;
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<StudentStats>({
    totalAssignments: 0,
    pendingSubmissions: 0,
    submittedAssignments: 0,
    averageGrade: 0,
    recentGrades: 0,
  });
  
  const [recentAssignments, setRecentAssignments] = useState<Assignment[]>([]);
  const [recentGrades, setRecentGrades] = useState<Grade[]>([]);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [seatAssignments, setSeatAssignments] = useState<SeatAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      
      // Fetch student assignments
      const assignmentsResponse = await fetch('/api/assignments/student', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        const assignments = assignmentsData.assignments || [];
        
        setRecentAssignments(assignments.slice(0, 5));
        
        // Calculate stats
        const totalAssignments = assignments.length;
        const submittedAssignments = assignments.filter((a: Assignment) => a.status === 'submitted' || a.status === 'graded').length;
        const pendingSubmissions = assignments.filter((a: Assignment) => a.status === 'pending').length;
        
        setStats(prev => ({
          ...prev,
          totalAssignments,
          submittedAssignments,
          pendingSubmissions,
        }));
      }
      
      // Fetch student grades
      const gradesResponse = await gradesAPI.getGrades({ limit: 10 });
      if (gradesResponse.data?.grades) {
        const grades = gradesResponse.data.grades;
        setRecentGrades(grades.slice(0, 3));
        
        // Calculate average grade
        const validGrades = grades.filter((g: Grade) => g.grade !== null && g.grade !== undefined);
        const averageGrade = validGrades.length > 0 
          ? validGrades.reduce((sum: number, g: Grade) => sum + (g.grade / g.maxGrade * 100), 0) / validGrades.length
          : 0;
        
        setStats(prev => ({
          ...prev,
          averageGrade: Math.round(averageGrade),
          recentGrades: validGrades.length,
        }));
      }
      
      // Fetch student group information
      const groupResponse = await fetch('/api/groups/my-group', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setGroupInfo(groupData.group);
      }

      // Fetch student seat assignments
      const seatResponse = await fetch('/api/groups/my-seat-info', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (seatResponse.ok) {
        const seatData = await seatResponse.json();
        setSeatAssignments(seatData.seatAssignments || []);
      }

    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'submitted': return '#10b981';
      case 'graded': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'individual': return '👤';
      case 'group': return '👥';
      case 'class': return '🏫';
      default: return '📝';
    }
  };

  if (loading) {
    return (
      <LoadingSpinner
        size="large"
        message="Loading your dashboard..."
      />
    );
  }

  return (
    <div className="student-dashboard">
      {/* Welcome Header */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back, {user?.firstName}!</h1>
          <p>Here's your academic progress and upcoming assignments.</p>
          <div className="student-info">
            <span className="student-id">Student ID: {user?.studentId}</span>
            {groupInfo && (
              <span className="group-info">
                Group: {groupInfo.name} {groupInfo.isLeader && '(Leader)'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <h3>{stats.totalAssignments}</h3>
              <p>Total Assignments</p>
            </div>
          </div>
          
          <div className="stat-card warning">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <h3>{stats.pendingSubmissions}</h3>
              <p>Pending Submissions</p>
            </div>
          </div>
          
          <div className="stat-card success">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{stats.submittedAssignments}</h3>
              <p>Submitted</p>
            </div>
          </div>
          
          <div className="stat-card info">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{stats.averageGrade}%</h3>
              <p>Average Grade</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Recent Assignments */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent Assignments</h2>
            <button 
              className="view-all-btn"
              onClick={() => navigate('/my-submissions')}
            >
              View All
            </button>
          </div>
          
          <div className="assignments-list">
            {recentAssignments.length > 0 ? (
              recentAssignments.map((assignment) => (
                <div key={assignment.id} className="assignment-item">
                  <div className="assignment-info">
                    <div className="assignment-header">
                      <span className="assignment-type">{getTypeIcon(assignment.type)}</span>
                      <h4>{assignment.title}</h4>
                      <span 
                        className="assignment-status"
                        style={{ backgroundColor: getStatusColor(assignment.status) }}
                      >
                        {assignment.status}
                      </span>
                    </div>
                    <p className="assignment-description">{assignment.description}</p>
                    <div className="assignment-meta">
                      <span>📍 {assignment.labName}</span>
                      <span>👥 {assignment.className}</span>
                      <span>📅 Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No assignments found. Check back later!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Grades */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent Grades</h2>
            <button 
              className="view-all-btn"
              onClick={() => navigate('/grades')}
            >
              View All
            </button>
          </div>
          
          <div className="grades-list">
            {recentGrades.length > 0 ? (
              recentGrades.map((grade) => (
                <div key={grade.id} className="grade-item">
                  <div className="grade-info">
                    <h4>{grade.assignmentTitle}</h4>
                    <div className="grade-score">
                      <span className="score">{grade.grade}/{grade.maxGrade}</span>
                      <span className="percentage">
                        ({Math.round((grade.grade / grade.maxGrade) * 100)}%)
                      </span>
                    </div>
                    <p className="grade-date">
                      Graded: {new Date(grade.gradedAt).toLocaleDateString()}
                    </p>
                    {grade.feedback && (
                      <p className="grade-feedback">{grade.feedback}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No grades available yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Group Information */}
        {groupInfo && (
          <div className="dashboard-section">
            <div className="section-header">
              <h2>My Group</h2>
              <button 
                className="view-all-btn"
                onClick={() => navigate('/groups')}
              >
                View Details
              </button>
            </div>
            
            <div className="group-card">
              <div className="group-header">
                <h3>{groupInfo.name}</h3>
                <span className="group-class">{groupInfo.className}</span>
                {groupInfo.isLeader && (
                  <span className="leader-badge">Leader</span>
                )}
              </div>
              
              <div className="group-members">
                <h4>Members ({groupInfo.memberCount})</h4>
                <div className="members-list">
                  {groupInfo.members.slice(0, 3).map((member) => (
                    <div key={member.id} className="member-item">
                      <span className="member-name">
                        {member.firstName} {member.lastName}
                      </span>
                      <span className="member-id">({member.studentId})</span>
                      {member.role === 'leader' && (
                        <span className="member-role">👑</span>
                      )}
                    </div>
                  ))}
                  {groupInfo.memberCount > 3 && (
                    <div className="more-members">
                      +{groupInfo.memberCount - 3} more members
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Seat Assignments */}
        {seatAssignments.length > 0 && (
          <div className="dashboard-section">
            <div className="section-header">
              <h2>My Seat Assignments</h2>
            </div>

            <div className="seat-assignments">
              {seatAssignments.slice(0, 3).map((seat) => (
                <div key={seat.id} className="seat-card">
                  <div className="seat-header">
                    <div className="seat-info">
                      <div className="seat-number">
                        <span className="seat-icon">🪑</span>
                        <span className="seat-text">Seat {seat.seatNumber}</span>
                      </div>
                      {seat.computerName && (
                        <div className="computer-number">
                          <span className="computer-icon">💻</span>
                          <span className="computer-text">{seat.computerName}</span>
                        </div>
                      )}
                    </div>
                    <span className="lab-name">{seat.labName}</span>
                  </div>

                  <div className="seat-details">
                    <p className="schedule-title">{seat.scheduleTitle}</p>
                    <div className="seat-meta">
                      <span>📅 {new Date(seat.scheduledDate).toLocaleDateString()}</span>
                      <span>⏰ {seat.startTime} - {seat.endTime}</span>
                      {seat.className && <span>👥 {seat.className}</span>}
                    </div>
                    {seat.computerGroupName && (
                      <p className="computer-group">👥 Computer assigned to: {seat.computerGroupName}</p>
                    )}
                    {seat.labLocation && (
                      <p className="lab-location">📍 {seat.labLocation}</p>
                    )}
                  </div>
                </div>
              ))}

              {seatAssignments.length > 3 && (
                <div className="more-seats">
                  +{seatAssignments.length - 3} more seat assignments
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          <button 
            className="action-btn primary"
            onClick={() => navigate('/my-submissions')}
          >
            📝 View Assignments
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => navigate('/grades')}
          >
            📊 Check Grades
          </button>
          {groupInfo && (
            <button 
              className="action-btn tertiary"
              onClick={() => navigate('/groups')}
            >
              👥 Group Details
            </button>
          )}
          <button 
            className="action-btn quaternary"
            onClick={() => navigate('/profile')}
          >
            👤 Update Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
