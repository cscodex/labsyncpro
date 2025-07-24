import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import './StudentGroups.css';

interface GroupMember {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  role: 'leader' | 'member';
}

interface GroupInfo {
  id: string;
  name: string;
  className: string;
  classId: string;
  maxMembers: number;
  memberCount: number;
  isLeader: boolean;
  description?: string;
  members: GroupMember[];
}

const StudentGroups: React.FC = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroupInfo();
  }, []);

  const fetchGroupInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/groups/my-group', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGroupInfo(data.group);
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to fetch group information');
      }
    } catch (error) {
      console.error('Error fetching group info:', error);
      showError('Failed to fetch group information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="student-groups loading">
        <div className="loading-spinner">Loading group information...</div>
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className="student-groups">
        <div className="page-header">
          <h1>My Group</h1>
          <p>View your group membership and member information</p>
        </div>
        
        <div className="no-group-card">
          <div className="no-group-icon">👥</div>
          <h2>No Group Assigned</h2>
          <p>You are not currently assigned to any group. Please contact your instructor for group assignment.</p>
          <div className="contact-info">
            <p><strong>What to do:</strong></p>
            <ul>
              <li>Contact your instructor or course coordinator</li>
              <li>Check if group assignments are still open</li>
              <li>Verify your enrollment in the correct class</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-groups">
      <div className="page-header">
        <h1>My Group</h1>
        <p>View your group membership and member information</p>
      </div>

      <div className="group-overview-card">
        <div className="group-header">
          <div className="group-title-section">
            <h2>{groupInfo.name}</h2>
            <div className="group-badges">
              <span className="class-badge">{groupInfo.className}</span>
              {groupInfo.isLeader && (
                <span className="leader-badge">👑 Group Leader</span>
              )}
            </div>
          </div>
          <div className="group-stats">
            <div className="stat-item">
              <span className="stat-number">{groupInfo.memberCount}</span>
              <span className="stat-label">Members</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{groupInfo.maxMembers}</span>
              <span className="stat-label">Max Size</span>
            </div>
          </div>
        </div>

        {groupInfo.description && (
          <div className="group-description">
            <h3>Description</h3>
            <p>{groupInfo.description}</p>
          </div>
        )}
      </div>

      <div className="members-section">
        <div className="section-header">
          <h2>Group Members ({groupInfo.memberCount})</h2>
          <div className="member-legend">
            <span className="legend-item">
              <span className="legend-icon">👑</span>
              <span>Leader</span>
            </span>
            <span className="legend-item">
              <span className="legend-icon">👤</span>
              <span>Member</span>
            </span>
          </div>
        </div>

        <div className="members-grid">
          {groupInfo.members.map((member) => (
            <div key={member.id} className={`member-card ${member.role}`}>
              <div className="member-avatar">
                {member.role === 'leader' ? '👑' : '👤'}
              </div>
              <div className="member-info">
                <h3>{member.firstName} {member.lastName}</h3>
                <p className="member-id">Student ID: {member.studentId}</p>
                <span className={`role-badge ${member.role}`}>
                  {member.role === 'leader' ? 'Group Leader' : 'Member'}
                </span>
              </div>
              {member.id === user?.id && (
                <div className="you-indicator">
                  <span>You</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {groupInfo.isLeader && (
        <div className="leader-info-card">
          <div className="leader-info-header">
            <span className="leader-icon">👑</span>
            <h3>Leadership Responsibilities</h3>
          </div>
          <div className="responsibilities-list">
            <p>As the group leader, you have the following responsibilities:</p>
            <ul>
              <li>Coordinate group activities and meetings</li>
              <li>Ensure all members participate in assignments</li>
              <li>Communicate with instructors on behalf of the group</li>
              <li>Help resolve any conflicts within the group</li>
              <li>Submit group assignments when required</li>
            </ul>
          </div>
        </div>
      )}

      <div className="group-actions">
        <div className="action-note">
          <p><strong>Note:</strong> Group membership is managed by your instructor. If you need to make changes to your group, please contact your course instructor or coordinator.</p>
        </div>
      </div>
    </div>
  );
};

export default StudentGroups;
