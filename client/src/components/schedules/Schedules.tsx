import React, { useState, useEffect } from 'react';
import { schedulesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import './Schedules.css';

interface Schedule {
  id: string;
  title: string;
  description: string;
  lab_name: string;
  instructor_first_name: string;
  instructor_last_name: string;
  class_name: string;
  scheduled_date: string;
  duration_minutes: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  max_participants: number;
  assignment_count: string;
  submission_count: string;
  assignment_type: 'group' | 'individual';
}

const Schedules: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');

  // Demo data
  const demoSchedules: Schedule[] = [
    {
      id: '1',
      title: 'Web Development Practical',
      description: 'HTML, CSS, and JavaScript fundamentals',
      lab_name: 'Lab 1',
      instructor_first_name: 'John',
      instructor_last_name: 'Smith',
      class_name: '11th Non-Medical A',
      scheduled_date: '2024-01-15T10:00:00Z',
      duration_minutes: 120,
      status: 'scheduled',
      max_participants: 15,
      assignment_count: '0',
      submission_count: '12',
      assignment_type: 'group'
    },
    {
      id: '2',
      title: 'Database Design Lab',
      description: 'MySQL database creation and queries',
      lab_name: 'Lab 2',
      instructor_first_name: 'John',
      instructor_last_name: 'Smith',
      class_name: '12th Non-Medical A',
      scheduled_date: '2024-01-16T14:00:00Z',
      duration_minutes: 90,
      status: 'scheduled',
      max_participants: 19,
      assignment_count: '0',
      submission_count: '16',
      assignment_type: 'individual'
    }
  ];

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        const response = await schedulesAPI.getSchedules();
        setSchedules(response.data.schedules || []);
      } catch (error) {
        console.error('Error fetching schedules:', error);
        console.warn('Using demo data for schedules');
        setSchedules(demoSchedules);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  const filteredSchedules = schedules.filter(schedule => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return schedule.status === 'scheduled' || schedule.status === 'in_progress';
    if (filter === 'completed') return schedule.status === 'completed';
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#3498db';
      case 'in_progress': return '#f39c12';
      case 'completed': return '#27ae60';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  if (loading) {
    return (
      <LoadingSpinner
        size="large"
        message="Loading schedules..."
      />
    );
  }

  return (
    <div className="schedules">
      <div className="schedules-header">
        <h1>Lab Schedules</h1>
        <p>View and manage laboratory session schedules</p>
      </div>

      <div className="schedules-controls">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
        </div>

        {user?.role === 'instructor' && (
          <button className="btn btn-primary">
            + Create Schedule
          </button>
        )}
      </div>

      <div className="schedules-grid">
        {filteredSchedules.map((schedule) => (
          <div key={schedule.id} className="schedule-card">
            <div className="schedule-header">
              <h3>{schedule.title}</h3>
              <div
                className="schedule-status"
                style={{ backgroundColor: getStatusColor(schedule.status) }}
              >
                {schedule.status.replace('_', ' ').toUpperCase()}
              </div>
            </div>

            <p className="schedule-description">{schedule.description}</p>

            <div className="schedule-details">
              <div className="detail-item">
                <strong>Lab:</strong> {schedule.lab_name}
              </div>
              <div className="detail-item">
                <strong>Class:</strong> {schedule.class_name}
              </div>
              <div className="detail-item">
                <strong>Instructor:</strong> {schedule.instructor_first_name} {schedule.instructor_last_name}
              </div>
              <div className="detail-item">
                <strong>Date & Time:</strong> {formatDate(schedule.scheduled_date)}
              </div>
              <div className="detail-item">
                <strong>Duration:</strong> {schedule.duration_minutes} minutes
              </div>
            </div>

            <div className="schedule-participants">
              <div className="participants-info">
                <span className="participants-count">
                  {schedule.submission_count}/{schedule.max_participants}
                </span>
                <span className="participants-label">Submissions/Max</span>
              </div>
              <div className="participants-bar">
                <div
                  className="participants-fill"
                  style={{
                    width: `${(parseInt(schedule.submission_count) / schedule.max_participants) * 100}%`
                  }}
                ></div>
              </div>
            </div>

            <div className="schedule-actions">
              <button className="btn btn-outline">View Details</button>
              {user?.role === 'student' && schedule.status === 'scheduled' && (
                <button className="btn btn-primary">Join Session</button>
              )}
              {user?.role === 'instructor' && (
                <button className="btn btn-secondary">Manage</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredSchedules.length === 0 && (
        <div className="no-schedules">
          <h3>No schedules found</h3>
          <p>There are no schedules matching your current filter.</p>
        </div>
      )}
    </div>
  );
};

export default Schedules;
