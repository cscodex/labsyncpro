import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Grades from './Grades';
import StudentGrades from '../student/StudentGrades';

const GradesRouter: React.FC = () => {
  const { user } = useAuth();

  // Show student-specific grades view for students
  if (user?.role === 'student') {
    return <StudentGrades />;
  }

  // Show admin/instructor grades management for other roles
  return <Grades />;
};

export default GradesRouter;
