import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Groups from './Groups';
import StudentGroups from '../student/StudentGroups';

const GroupsRouter: React.FC = () => {
  const { user } = useAuth();

  // Show student-specific groups view for students
  if (user?.role === 'student') {
    return <StudentGroups />;
  }

  // Show admin/instructor groups management for other roles
  return <Groups />;
};

export default GroupsRouter;
