import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { schedulesAPI, submissionsAPI, gradesAPI, dashboardAPI } from '../../services/api';
import StudentDashboard from '../student/StudentDashboard';
import './Dashboard.css';

interface DashboardStats {
  upcomingSchedules: number;
  pendingSubmissions: number;
  recentGrades: number;
  totalSchedules: number;
  totalStudents: number;
  totalGroups: number;
  totalComputers: number;
}

interface RecentActivity {
  id: string;
  type: 'schedule' | 'submission' | 'grade';
  title: string;
  date: string;
  status?: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Redirect students to their dedicated dashboard
  if (user?.role === 'student') {
    return <StudentDashboard />;
  }
  const [stats, setStats] = useState<DashboardStats>({
    upcomingSchedules: 0,
    pendingSubmissions: 0,
    recentGrades: 0,
    totalSchedules: 0,
    totalStudents: 0,
    totalGroups: 0,
    totalComputers: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch schedules
      const schedulesResponse = await schedulesAPI.getSchedules({
        limit: 10,
        status: 'scheduled'
      });
      
      // Fetch submissions (for students) or all submissions (for instructors)
      const submissionsResponse = await submissionsAPI.getSubmissions({
        limit: 10,
        ...(user?.role === 'student' && { status: 'submitted' })
      });
      
      // Fetch recent grades
      const gradesResponse = await gradesAPI.getGrades({
        limit: 5
      });

      // Fetch system statistics
      const systemStatsResponse = await dashboardAPI.getSystemStats();

      // Calculate stats
      const upcomingSchedules = schedulesResponse.data.schedules.filter((schedule: any) => {
        const scheduleDate = new Date(schedule.scheduled_date);
        const today = new Date();
        return scheduleDate >= today;
      }).length;

      setStats({
        upcomingSchedules,
        pendingSubmissions: user?.role === 'student'
          ? submissionsResponse.data.submissions.filter((sub: any) => sub.status === 'submitted').length
          : submissionsResponse.data.submissions.filter((sub: any) => sub.status === 'submitted').length,
        recentGrades: gradesResponse.data.grades.length,
        totalSchedules: schedulesResponse.data.pagination?.total || 0,
        totalStudents: systemStatsResponse.data.totalStudents || 0,
        totalGroups: systemStatsResponse.data.totalGroups || 0,
        totalComputers: systemStatsResponse.data.totalComputers || 0,
      });

      // Prepare recent activity
      const activities: RecentActivity[] = [
        ...schedulesResponse.data.schedules.slice(0, 3).map((schedule: any) => ({
          id: schedule.id,
          type: 'schedule' as const,
          title: schedule.title,
          date: schedule.scheduled_date,
          status: schedule.status,
        })),
        ...submissionsResponse.data.submissions.slice(0, 3).map((submission: any) => ({
          id: submission.id,
          type: 'submission' as const,
          title: submission.schedule_title,
          date: submission.submitted_at,
          status: submission.status,
        })),
        ...gradesResponse.data.grades.slice(0, 2).map((grade: any) => ({
          id: grade.id,
          type: 'grade' as const,
          title: grade.schedule_title,
          date: grade.graded_at,
          status: `${grade.score}/${grade.max_score}`,
        })),
      ];

      // Sort by date and take most recent
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activities.slice(0, 8));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'schedule': return '📅';
      case 'submission': return '📝';
      case 'grade': return '📈';
      default: return '📋';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {user?.firstName}!</h1>
        <p>Here's what's happening in your lab activities.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {/* System Statistics */}
        <div className="stat-card system-stat">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.totalStudents}</h3>
            <p>Total Students</p>
          </div>
        </div>

        <div className="stat-card system-stat">
          <div className="stat-icon">🏷️</div>
          <div className="stat-content">
            <h3>{stats.totalGroups}</h3>
            <p>Total Groups</p>
          </div>
        </div>

        <div className="stat-card system-stat">
          <div className="stat-icon">💻</div>
          <div className="stat-content">
            <h3>{stats.totalComputers}</h3>
            <p>Total Computers</p>
          </div>
        </div>

        {/* Activity Statistics */}
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>{stats.upcomingSchedules}</h3>
            <p>Upcoming Schedules</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <h3>{stats.pendingSubmissions}</h3>
            <p>{user?.role === 'student' ? 'Pending Submissions' : 'Submissions to Grade'}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>{stats.recentGrades}</h3>
            <p>Recent Grades</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>{stats.totalSchedules}</h3>
            <p>Total Schedules</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-section">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div key={`${activity.type}-${activity.id}`} className="activity-item">
                <div className="activity-icon">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="activity-content">
                  <h4>{activity.title}</h4>
                  <p>
                    {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                    {activity.status && ` • ${activity.status}`}
                  </p>
                </div>
                <div className="activity-date">
                  {formatDate(activity.date)}
                </div>
              </div>
            ))
          ) : (
            <div className="no-activity">
              <p>No recent activity to display.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          {user?.role === 'instructor' && (
            <>
              <button className="action-button">
                📅 Create Schedule
              </button>
              <button className="action-button">
                📊 View Analytics
              </button>
            </>
          )}
          {user?.role === 'student' && (
            <>
              <button className="action-button">
                👥 Join Group
              </button>
              <button className="action-button">
                📝 Submit Assignment
              </button>
            </>
          )}
          <button className="action-button">
            👤 Update Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
